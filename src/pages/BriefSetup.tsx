import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { SchedulingStep } from "@/components/onboarding/SchedulingStep";

const BriefSetup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(true);
  const [generationStep, setGenerationStep] = useState("🚀 Démarrage de la génération...");
  const [generationComplete, setGenerationComplete] = useState(false);
  const [briefGenerated, setBriefGenerated] = useState(false);
  
  // Scheduling state
  const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleHour, setScheduleHour] = useState(8);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [scheduleTimezone, setScheduleTimezone] = useState('Europe/Paris');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  useEffect(() => {
    // Load user preferences
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: preferences } = await supabase
        .from('preferences')
        .select('whatsapp_phone, send_dow, send_hour, timezone')
        .eq('user_id', user.id)
        .single();

      if (preferences) {
        setWhatsappPhone(preferences.whatsapp_phone || '');
        setScheduleDay(preferences.send_dow || 1);
        setScheduleHour(preferences.send_hour || 8);
        setScheduleTimezone(preferences.timezone || 'Europe/Paris');
      }
    };

    loadUserData();
    generateBrief();
  }, []);

  const generateBrief = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const messages = [
        "Ton avatar analyse tes données Airtable...",
        "Identification des KPIs les plus importants...",
        "Création du narratif personnalisé...",
        "Synthèse vocale en cours..."
      ];

      let currentMessageIndex = 0;
      const messageInterval = setInterval(() => {
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        setGenerationStep(messages[currentMessageIndex]);
      }, 4000);

      // Check Airtable views
      const { data: views } = await supabase
        .from('airtable_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true);

      if (!views || views.length === 0) {
        throw new Error("Aucune vue Airtable sélectionnée");
      }

      const totalLines = views.reduce((sum, view) => {
        const schemaData = view.schema_json as any;
        const rowCount = schemaData?.fields?.[0]?.sampleData?.length || 0;
        return sum + rowCount;
      }, 0);

      const totalCells = views.reduce((sum, view) => {
        const schemaData = view.schema_json as any;
        const fieldCount = schemaData?.fields?.length || 0;
        const rowCount = schemaData?.fields?.[0]?.sampleData?.length || 0;
        return sum + (fieldCount * rowCount);
      }, 0);

      setGenerationStep(`📊 ${totalLines} lignes détectées dans ${views.length} vue${views.length > 1 ? 's' : ''} (≈${totalCells} cellules)`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      setGenerationStep("🤖 Analyse de vos données (~22s)...");

      const { data: briefData, error: briefError } = await supabase.functions.invoke(
        'generate-complete-brief-stream',
        { body: { user_id: user.id, is_onboarding: true } }
      );

      if (briefError) throw briefError;
      if (!briefData?.brief_id) throw new Error("Erreur lors de la génération du brief");

      clearInterval(messageInterval);
      setGenerationStep("📲 Envoi de ton brief sur WhatsApp...");

      const { error: sendError } = await supabase.functions.invoke(
        'send-whatsapp-brief',
        { 
          body: { 
            brief_id: briefData.brief_id,
            phone_number: whatsappPhone
          }
        }
      );

      if (sendError) throw sendError;

      setGenerationStep("✅ Brief envoyé avec succès !");
      toast({
        title: "🎉 Ton premier brief est en route !",
        description: "Vérifie ton WhatsApp dans quelques instants"
      });
      
      setTimeout(() => {
        setGeneratingBrief(false);
        setGenerationComplete(true);
        setBriefGenerated(true);
      }, 2000);
    } catch (error: any) {
      console.error("Error generating brief:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération du brief",
        variant: "destructive"
      });
      setGenerationStep("❌ Erreur lors de la génération");
      setGeneratingBrief(false);
    }
  };

  const handleActivateSchedule = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Calculate next_send_at via database function
      const { data: nextSendData, error: calcError } = await supabase.rpc('calculate_next_send_at', {
        schedule_type: scheduleFrequency,
        day_of_week: scheduleFrequency === 'weekly' ? scheduleDay : null,
        day_of_month: scheduleFrequency === 'monthly' ? scheduleDay : null,
        hour: scheduleHour,
        minute: scheduleMinute,
        timezone: scheduleTimezone
      });

      if (calcError) throw calcError;

      const { error: scheduleError } = await supabase
        .from('scheduled_briefs')
        .upsert({
          user_id: user.id,
          schedule_type: scheduleFrequency,
          day_of_week: scheduleFrequency === 'weekly' ? scheduleDay : null,
          day_of_month: scheduleFrequency === 'monthly' ? scheduleDay : null,
          hour: scheduleHour,
          minute: scheduleMinute,
          timezone: scheduleTimezone,
          phone_number: whatsappPhone,
          is_active: true,
          next_send_at: nextSendData
        }, {
          onConflict: 'user_id'
        });

      if (scheduleError) throw scheduleError;

      toast({
        title: "Planning activé ! 🎉",
        description: "Tu recevras désormais tes briefs automatiquement"
      });

      setTimeout(() => navigate('/app'), 1000);
    } catch (error: any) {
      console.error("Error activating schedule:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'activation du planning",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Generation Status Card */}
        <Card className={`transition-all duration-500 ${generationComplete ? 'border-accent' : ''}`}>
          <CardHeader>
            <div className="flex items-center gap-2 text-accent mb-2">
              {generatingBrief ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <CardTitle>
                {generatingBrief ? "Génération de ton premier brief..." : "Brief généré avec succès !"}
              </CardTitle>
            </div>
            {generatingBrief && (
              <CardDescription>
                Ton avatar est en train de créer ton premier brief personnalisé
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {generatingBrief && (
                  <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                )}
                <p className="text-center font-medium text-lg">{generationStep}</p>
                <p className="text-center text-sm text-muted-foreground">
                  {generationStep.includes("Airtable") && "On analyse tes données pour comprendre ton activité..."}
                  {generationStep.includes("WhatsApp") && "Plus que quelques secondes avant de recevoir ton brief ! 📱"}
                  {generationStep.includes("succès") && "C'est parti ! Direction ton WhatsApp 🎉"}
                </p>
              </div>
              {generationComplete && (
                <div className="bg-accent/10 border border-accent rounded-lg p-4 text-center">
                  <p className="text-sm font-medium">
                    🎉 Ton brief est en route vers ton WhatsApp !
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pendant ce temps, configure tes envois automatiques ci-dessous
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduling Configuration Card */}
        <Card className="transition-all duration-500">
          <CardHeader>
            <div className="flex items-center gap-2 text-accent mb-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Configure tes briefs automatiques</CardTitle>
            </div>
            <CardDescription>
              Choisis quand tu veux recevoir tes briefs hebdomadaires ou mensuels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SchedulingStep
              scheduleFrequency={scheduleFrequency}
              setScheduleFrequency={setScheduleFrequency}
              scheduleDay={scheduleDay}
              setScheduleDay={setScheduleDay}
              scheduleHour={scheduleHour}
              setScheduleHour={setScheduleHour}
              scheduleMinute={scheduleMinute}
              setScheduleMinute={setScheduleMinute}
              timezone={scheduleTimezone}
              setTimezone={setScheduleTimezone}
              whatsappPhone={whatsappPhone}
            />

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
                disabled={isLoading}
              >
                Configurer plus tard
              </Button>
              <Button
                onClick={handleActivateSchedule}
                disabled={isLoading || !briefGenerated}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {isLoading ? "Activation..." : "Activer les briefs automatiques"}
              </Button>
            </div>

            {!briefGenerated && (
              <p className="text-xs text-center text-muted-foreground">
                L'activation sera disponible une fois ton premier brief envoyé
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BriefSetup;
