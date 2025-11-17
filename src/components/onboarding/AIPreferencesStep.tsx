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
import { z } from "zod";

const onboardingSchema = z.object({
  sector_final: z.string().min(2, "Secteur trop court").max(100, "Secteur trop long"),
  north_star_metric: z.string().min(2, "Métrique trop courte").max(200, "Métrique trop longue"),
  kpis_final: z.array(z.string().max(100, "KPI trop long")).max(20, "Maximum 20 KPIs"),
  preferred_tone: z.enum(["no-bs", "sobre", "coach", "energique"]),
  language: z.string(),
  timezone: z.string()
});

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
  const [refiningMessages] = useState([
    "🤔 Je réfléchis à ta réponse...",
    "💡 J'ajuste mes recommandations...",
    "🎯 Je peaufine ton contexte...",
    "✨ Presque terminé, patience !"
  ]);
  const [currentRefiningMessage, setCurrentRefiningMessage] = useState(0);
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
    loadOrStartInferPhase();
  }, []);

  const loadOrStartInferPhase = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Check if user already has onboarding data
      const { data: existingOnboarding, error: fetchError } = await supabase
        .from('onboarding')
        .select('infer_json, final_context')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[AIPreferencesStep] Error fetching onboarding:', fetchError);
      }

      // If data exists and is recent (< 72h), load it directly
      if (existingOnboarding?.final_context) {
        console.log('[AIPreferencesStep] Loading existing onboarding data');
        const finalCtx = existingOnboarding.final_context as any;
        const ctx = finalCtx.context || {};
        
        // Load prior inference for potential refine
        if (existingOnboarding.infer_json) {
          setPriorInference(existingOnboarding.infer_json as any);
        }
        
        setSectorFinal(ctx.sector_final || "");
        setNorthStarMetric(ctx.north_star_metric || "");
        setKpisFinal(ctx.kpis_final || []);
        setPreferredTone(ctx.preferred_tone || "no-bs");
        setLanguage(ctx.language || "fr");
        setTimezone(ctx.timezone || "Europe/Paris");
        
        setSampleBrief(finalCtx.sample_brief || "");
        setConfirmationMessage(finalCtx.confirmation_message || "");
        
        setPhase('refined');
        toast.success("Configuration chargée");
        setLoading(false);
        return;
      }

      // Otherwise, start the infer phase
      await startInferPhase();
    } catch (error: any) {
      console.error('[AIPreferencesStep] Error in loadOrStartInferPhase:', error);
      // Fallback to normal infer phase
      await startInferPhase();
    }
  };

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
                maxRecords: 10
              }
            });

            if (error) throw error;

            // Extract records from the response structure
            const records = data?.views?.[0]?.records || [];
            
            return {
              view_name: view.viewName,
              table_name: view.tableName,
              rows: records
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
        // Airtable records have structure: { id, createdTime, fields: {...} }
        const firstRecord = sample?.rows?.[0];
        const recordFields = firstRecord?.fields || {};
        
        const fields = Object.keys(recordFields).map(key => ({
          name: key,
          type: typeof recordFields[key]
        }));
        
        return {
          view_name: view.viewName,
          table_name: view.tableName,
          fields,
          row_count: sample?.rows?.length || 0
        };
      });

      console.log('[AIPreferencesStep] Calling infer phase with', viewsSchema.length, 'views');
      console.log('[AIPreferencesStep] viewsSchema:', JSON.stringify(viewsSchema, null, 2));
      console.log('[AIPreferencesStep] samples preview:', JSON.stringify(samples).substring(0, 500));

      // Transform samples to extract only the fields from Airtable records
      const transformedSamples = samples.map(sample => ({
        view_name: sample.view_name,
        table_name: sample.table_name,
        rows: sample.rows.map((record: any) => record.fields || {})
      }));

      // Call infer phase
      const { data: inferData, error: inferError } = await supabase.functions.invoke('onboarding-ai-infer', {
        body: {
          phase: 'infer',
          lang: 'fr',
          tz: 'Europe/Paris',
          views_schema: viewsSchema,
          samples: transformedSamples
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
    const reply = userReply.trim();
    
    // Validation
    if (!reply) {
      toast.error("Écris une réponse avant d'envoyer");
      return;
    }
    
    if (reply.length > 1000) {
      toast.error("Réponse trop longue (max 1000 caractères)");
      return;
    }

    setRefining(true);
    setCurrentRefiningMessage(0);
    
    // Rotate through fun messages
    const messageInterval = setInterval(() => {
      setCurrentRefiningMessage(prev => (prev + 1) % refiningMessages.length);
    }, 8000);
    
    try {
      console.log('[AIPreferencesStep] Calling refine phase');

      const { data: refineData, error: refineError } = await supabase.functions.invoke('onboarding-ai-infer', {
        body: {
          phase: 'refine',
          lang: 'fr',
          tz: 'Europe/Paris',
          prior_inference: {
            // Only send essential context, not full samples
            sector_guess: priorInference?.sector_guess,
            suggested_kpis: priorInference?.suggested_kpis,
            pitch_message: priorInference?.pitch_message,
            context: priorInference?.context
          },
          user_reply_raw: reply
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
      clearInterval(messageInterval);
      setRefining(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Validate inputs
      try {
        onboardingSchema.parse({
          sector_final: sectorFinal,
          north_star_metric: northStarMetric,
          kpis_final: kpisFinal,
          preferred_tone: preferredTone,
          language,
          timezone
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          toast.error(validationError.errors[0].message);
          setLoading(false);
          return;
        }
        throw validationError;
      }

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
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-line max-h-64 overflow-y-auto">
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
                <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                  {kpi}
                  <button
                    type="button"
                    onClick={() => setKpisFinal(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Ajouter un KPI..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const newKpi = e.currentTarget.value.trim();
                  if (newKpi.length > 100) {
                    toast.error("KPI trop long (max 100 caractères)");
                    return;
                  }
                  if (kpisFinal.length >= 20) {
                    toast.error("Maximum 20 KPIs autorisés");
                    return;
                  }
                  setKpisFinal(prev => [...prev, newKpi]);
                  e.currentTarget.value = '';
                }
              }}
            />
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
                  {refiningMessages[currentRefiningMessage]}
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
