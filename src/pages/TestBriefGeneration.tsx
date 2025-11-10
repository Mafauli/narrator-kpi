import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Download, Send } from "lucide-react";
import { useBriefGeneration } from "@/hooks/useBriefGeneration";
import { useSendWhatsAppBrief } from "@/hooks/useSendWhatsAppBrief";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TestBriefGeneration = () => {
  const { generating, logs, result, generateBrief } = useBriefGeneration();
  const { sendBrief, sending } = useSendWhatsAppBrief();
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [countryCode, setCountryCode] = useState("+33");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Auto-scroll vers le dernier log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleGenerate = async () => {
    await generateBrief();
  };

  const downloadJSON = () => {
    if (!result?.brief_text) return;
    const dataStr = JSON.stringify(result.brief_text, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brief-${result.brief_id}.json`;
    link.click();
  };

  const downloadAudio = () => {
    if (!result?.audio_url) return;
    const link = document.createElement("a");
    link.href = result.audio_url;
    link.download = `brief-${result.brief_id}.mp3`;
    link.click();
  };

  const handleSendWhatsApp = async () => {
    if (!displayResult?.brief_id || !phoneNumber) return;
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    await sendBrief({ 
      brief_id: displayResult.brief_id, 
      phone_number: fullPhoneNumber 
    });
  };

  const loadHistoricalExample = () => {
    // Charger un exemple historique mocké pour tester l'UI sans appeler les APIs
    const mockResult = {
      success: true,
      brief_id: "example-brief-123",
      audio_url: "/audio/brief-example.wav",
      brief_text: {
        introduction: "Bonjour ! Voici votre brief hebdomadaire du 4 au 10 novembre. Cette semaine, nous observons des performances solides avec quelques points d'attention à ne pas négliger.",
        kpi_analysis: "MRR : 45 000€ (+12% vs semaine dernière)\nTaux de conversion : 3.2% (-0.3 points)\nNombre de nouveaux clients : 23 (+5)\nChurn rate : 2.1% (stable)",
        insights: "La croissance du MRR est excellente, portée par l'acquisition de nouveaux clients. Cependant, le taux de conversion montre un léger recul qui mérite notre attention. Le churn reste stable, ce qui est positif.",
        actions: [
          {
            title: "Optimiser le tunnel de conversion",
            priority: "high",
            why: "Le taux de conversion a baissé de 0.3 points cette semaine",
            how: "Analyser les points de friction dans le parcours d'inscription et A/B tester de nouvelles variantes de la landing page"
          },
          {
            title: "Renforcer l'onboarding des nouveaux clients",
            priority: "medium",
            why: "23 nouveaux clients cette semaine, il faut maximiser leur activation",
            how: "Mettre en place des emails d'onboarding personnalisés et des appels de bienvenue"
          }
        ],
        conclusion: "Globalement, c'est une très bonne semaine avec une croissance solide. Concentrons-nous sur l'amélioration du taux de conversion pour capitaliser sur le trafic existant. Excellente continuation !"
      },
      metadata: {
        avatar: "Emma",
        voice: "Emma - Professional",
        total_records: 156,
        filtered_records: 42,
        generation_time_ms: 3420
      }
    };
    
    // Utiliser la même structure que generateBrief pour mettre à jour le state
    // On simule les logs aussi
    const mockLogs = [
      { icon: "📊", message: "Exemple historique chargé", type: "success", timestamp: new Date() },
      { icon: "✅", message: "Données mockées prêtes pour test", type: "success", timestamp: new Date() }
    ];
    
    // On doit directement manipuler le state du hook, donc on va plutôt 
    // créer un state local pour l'exemple
    setMockExample(mockResult);
  };

  const [mockExample, setMockExample] = useState<any>(null);
  const displayResult = mockExample || result;
  const isMockData = mockExample !== null;

  const getLogColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-orange-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Test Brief Generation</h1>
            <p className="text-muted-foreground">
              Workflow complet : Airtable → DeepSeek → ElevenLabs
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadHistoricalExample}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              📋 Charger exemple historique
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Générer un brief
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs de génération</CardTitle>
              <CardDescription>
                Suivi en temps réel du workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-sm max-h-[500px] overflow-y-auto">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 py-1 px-2 rounded ${getLogColor(log.type)} animate-in fade-in slide-in-from-left-2 duration-200`}
                  >
                    <span className="text-base flex-shrink-0">{log.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{log.message}</span>
                      {log.details && (
                        <span className="ml-2 text-xs opacity-70">
                          {log.details}
                        </span>
                      )}
                    </div>
                    <span className="text-xs opacity-50 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
                {generating && logs.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Génération en cours...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Section */}
        {displayResult && displayResult.success && (
          <div className="space-y-6">
            {/* Metadata */}
            {displayResult.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle>Métadonnées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Avatar</div>
                      <div className="font-semibold">{displayResult.metadata.avatar}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Voix</div>
                      <div className="font-semibold">{displayResult.metadata.voice}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Records</div>
                      <div className="font-semibold">
                        {displayResult.metadata.filtered_records} / {displayResult.metadata.total_records}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Durée</div>
                      <div className="font-semibold">
                        {(displayResult.metadata.generation_time_ms / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Player */}
            {displayResult.audio_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Audio généré</CardTitle>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full" src={displayResult.audio_url}>
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                </CardContent>
              </Card>
            )}

            {/* Brief Text */}
            {displayResult.brief_text && (
              <Card>
                <CardHeader>
                  <CardTitle>Texte du brief</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="introduction">
                      <AccordionTrigger>Introduction</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed">
                          {displayResult.brief_text.introduction}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="analysis">
                      <AccordionTrigger>Analyse KPIs</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {displayResult.brief_text.kpi_analysis}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="insights">
                      <AccordionTrigger>Insights</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {displayResult.brief_text.insights}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    {displayResult.brief_text.actions && displayResult.brief_text.actions.length > 0 && (
                      <AccordionItem value="actions">
                        <AccordionTrigger>
                          Actions recommandées ({displayResult.brief_text.actions.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {displayResult.brief_text.actions.map((action, index) => (
                              <div
                                key={index}
                                className="border rounded-lg p-4 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold">{action.title}</h4>
                                  <Badge variant={getPriorityColor(action.priority)}>
                                    {action.priority}
                                  </Badge>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div>
                                    <span className="font-medium text-muted-foreground">
                                      Pourquoi :{" "}
                                    </span>
                                    {action.why}
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">
                                      Comment :{" "}
                                    </span>
                                    {action.how}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="conclusion">
                      <AccordionTrigger>Conclusion</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed">
                          {displayResult.brief_text.conclusion}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Download Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Téléchargements</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={downloadJSON} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger le JSON
                </Button>
                <Button onClick={downloadAudio} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger l'audio
                </Button>
              </CardContent>
            </Card>

            {/* WhatsApp Send */}
            <Card>
              <CardHeader>
                <CardTitle>Envoyer via WhatsApp</CardTitle>
                <CardDescription>
                  {isMockData 
                    ? "⚠️ Générez un vrai brief pour pouvoir l'envoyer via WhatsApp" 
                    : "Envoyez ce brief directement sur WhatsApp"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-32">
                      <Label htmlFor="country-code">Indicatif</Label>
                      <Input
                        id="country-code"
                        type="text"
                        placeholder="+33"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={isMockData}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="phone-number">Numéro de téléphone</Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        placeholder="612345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isMockData}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendWhatsApp} 
                    disabled={sending || !phoneNumber || isMockData}
                    className="gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Envoyer sur WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Display */}
        {result && !result.success && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{result.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestBriefGeneration;
