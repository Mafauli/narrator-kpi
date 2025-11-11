import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIPreferencesStepProps {
  onComplete: () => void;
  selectedViews: Array<{
    baseId: string;
    baseName: string;
    tableId: string;
    tableName: string;
    viewId: string;
    viewName: string;
  }>;
}

export const AIPreferencesStep = ({ onComplete, selectedViews }: AIPreferencesStepProps) => {
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);
  const [phase, setPhase] = useState<'infer' | 'chat' | 'refined'>('infer');
  
  // AI Response data
  const [pitchMessage, setPitchMessage] = useState("");
  const [sampleBrief, setSampleBrief] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  
  // Form fields (editable)
  const [sectorFinal, setSectorFinal] = useState<string>("");
  const [northStarMetric, setNorthStarMetric] = useState("");
  const [kpisFinal, setKpisFinal] = useState<string[]>([]);
  const [preferredTone, setPreferredTone] = useState<string>("");
  const [language, setLanguage] = useState("fr");
  const [timezone, setTimezone] = useState("Europe/Paris");
  
  // User reply
  const [userReply, setUserReply] = useState("");
  
  // Prior inference for refine phase
  const [priorInference, setPriorInference] = useState<any>(null);

  useEffect(() => {
    startInferPhase();
  }, []);

  const startInferPhase = async () => {
    setLoading(true);
    try {
      // Fetch data from selected views
      const viewsData = await Promise.all(
        selectedViews.slice(0, 3).map(async (view) => {
          try {
            const { data, error } = await supabase.functions.invoke('fetch-airtable-data', {
              body: {
                baseId: view.baseId,
                tableId: view.tableId,
                viewId: view.viewId,
                maxRecords: 50
              }
            });

            if (error) throw error;

            return {
              view_name: view.viewName,
              table_name: view.tableName,
              rows: data?.records || []
            };
          } catch (err) {
            console.error(`Error fetching view ${view.viewName}:`, err);
            return null;
          }
        })
      );

      const samples = viewsData.filter(v => v !== null);

      // Build views schema
      const viewsSchema = selectedViews.slice(0, 3).map((view, idx) => {
        const sample = samples[idx];
        const fields = sample?.rows?.[0] 
          ? Object.keys(sample.rows[0]).map(key => ({
              name: key,
              type: typeof sample.rows[0][key]
            }))
          : [];
        
        return {
          view_name: view.viewName,
          table_name: view.tableName,
          fields,
          row_count: sample?.rows?.length || 0
        };
      });

      console.log('[AIPreferencesStep] Calling infer phase with', viewsSchema.length, 'views');

      // Call infer phase
      const { data: inferData, error: inferError } = await supabase.functions.invoke('onboarding-ai-infer', {
        body: {
          phase: 'infer',
          lang: 'fr',
          tz: 'Europe/Paris',
          views_schema: viewsSchema,
          samples
        }
      });

      if (inferError) throw inferError;

      console.log('[AIPreferencesStep] Infer response:', inferData);

      // Update UI with AI response
      setPriorInference(inferData);
      setPitchMessage(inferData.pitch_message || "");
      setSampleBrief(inferData.sample_brief || "");
      
      // Pre-fill form from context
      const ctx = inferData.context || {};
      setSectorFinal(ctx.sector_final || inferData.sector_guess || "");
      setNorthStarMetric(ctx.north_star_metric || "");
      setKpisFinal(ctx.kpis_final || inferData.suggested_kpis || []);
      setPreferredTone(ctx.preferred_tone || "no-bs");
      setLanguage(ctx.language || "fr");
      setTimezone(ctx.timezone || "Europe/Paris");

      setPhase('chat');
      toast.success("Analyse terminée !");
    } catch (error: any) {
      console.error('[AIPreferencesStep] Error in infer phase:', error);
      toast.error("Erreur lors de l'analyse : " + (error.message || "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  };

  const handleUserReply = async () => {
    if (!userReply.trim()) {
      toast.error("Écris une réponse avant d'envoyer");
      return;
    }

    setRefining(true);
    try {
      console.log('[AIPreferencesStep] Calling refine phase');

      const { data: refineData, error: refineError } = await supabase.functions.invoke('onboarding-ai-infer', {
        body: {
          phase: 'refine',
          lang: 'fr',
          tz: 'Europe/Paris',
          prior_inference: priorInference,
          user_reply_raw: userReply
        }
      });

      if (refineError) throw refineError;

      console.log('[AIPreferencesStep] Refine response:', refineData);

      // Update form with refined context
      const ctx = refineData.context || {};
      setSectorFinal(ctx.sector_final || "");
      setNorthStarMetric(ctx.north_star_metric || "");
      setKpisFinal(ctx.kpis_final || []);
      setPreferredTone(ctx.preferred_tone || "no-bs");
      setLanguage(ctx.language || "fr");
      setTimezone(ctx.timezone || "Europe/Paris");

      setConfirmationMessage(refineData.confirmation_message || "");
      setSampleBrief(refineData.sample_brief || "");

      setPhase('refined');
      toast.success("Contexte affiné !");
    } catch (error: any) {
      console.error('[AIPreferencesStep] Error in refine phase:', error);
      toast.error("Erreur lors de l'affinement : " + (error.message || "Erreur inconnue"));
    } finally {
      setRefining(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Map sector to business_model
      let businessModel: "saas" | "ecommerce" | "services" | "other" = "other";
      if (sectorFinal === "saas") businessModel = "saas";
      else if (sectorFinal === "ecommerce") businessModel = "ecommerce";
      else if (sectorFinal === "services") businessModel = "services";

      // Map tone
      let toneValue: "sobre" | "coach" | "energique" | "no-bs" = "no-bs";
      if (["sobre", "coach", "energique", "no-bs"].includes(preferredTone)) {
        toneValue = preferredTone as any;
      }

      const { error } = await supabase.from("preferences").upsert({
        user_id: user.id,
        business_model: businessModel,
        currency: "EUR",
        lang: language.toUpperCase(),
        timezone,
        send_dow: 1,
        send_hour: 8,
        north_star: northStarMetric || null,
        goal_value: null,
        tone: toneValue,
        kpi_pack_json: { kpis: kpisFinal },
        thresholds_json: {}
      });

      if (error) throw error;

      toast.success("Préférences enregistrées !");
      onComplete();
    } catch (error: any) {
      console.error('[AIPreferencesStep] Error saving preferences:', error);
      toast.error("Erreur lors de l'enregistrement : " + (error.message || "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  };

  if (loading && phase === 'infer') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-accent mb-2">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <CardTitle>Analyse de vos vues Airtable…</CardTitle>
          </div>
          <CardDescription>
            L'IA analyse vos données pour vous proposer une configuration optimale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Analyse en cours...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-accent mb-2">
          <Sparkles className="h-5 w-5" />
          <CardTitle>Configuration intelligente</CardTitle>
        </div>
        <CardDescription>
          L'IA a analysé vos données et vous propose une configuration personnalisée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pitch Message */}
        {pitchMessage && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <p className="text-sm">{pitchMessage}</p>
          </div>
        )}

        {/* Sample Brief */}
        {sampleBrief && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Aperçu de votre brief
            </Label>
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {sampleBrief}
            </div>
          </div>
        )}

        {/* Editable Form */}
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Secteur d'activité</Label>
            <Select value={sectorFinal} onValueChange={setSectorFinal}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionne ton secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>North Star Metric</Label>
            <Input 
              value={northStarMetric} 
              onChange={(e) => setNorthStarMetric(e.target.value)}
              placeholder="Ex: MRR, GMV, Utilisateurs actifs..."
            />
          </div>

          <div className="space-y-2">
            <Label>KPIs principaux</Label>
            <div className="flex flex-wrap gap-2">
              {kpisFinal.map((kpi, idx) => (
                <Badge key={idx} variant="secondary">{kpi}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ton préféré</Label>
            <Select value={preferredTone} onValueChange={setPreferredTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-bs">No-BS (direct)</SelectItem>
                <SelectItem value="sobre">Sobre</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="energique">Énergique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Zone */}
        {phase === 'chat' && (
          <div className="space-y-4 border-t pt-4">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Parle-nous de tes objectifs et contraintes
            </Label>
            <Textarea
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
              placeholder="Ex: Je veux suivre l'évolution du churn, être alerté si les revenus baissent de 10%, recevoir des recommandations actionnables..."
              rows={4}
            />
            <Button 
              onClick={handleUserReply} 
              disabled={refining || !userReply.trim()}
              className="w-full"
            >
              {refining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Affinage en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Affiner la configuration
                </>
              )}
            </Button>
          </div>
        )}

        {/* Confirmation Message */}
        {phase === 'refined' && confirmationMessage && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm">{confirmationMessage}</p>
          </div>
        )}

        {/* Continue Button */}
        {phase === 'refined' && (
          <Button 
            onClick={handleSaveAndContinue} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Continuer"
            )}
          </Button>
        )}

        {/* Skip for now (optional) */}
        {phase === 'chat' && (
          <Button 
            onClick={handleSaveAndContinue} 
            variant="outline"
            className="w-full"
          >
            Passer cette étape
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
