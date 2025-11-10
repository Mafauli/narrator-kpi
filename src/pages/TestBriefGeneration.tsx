import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Download } from "lucide-react";
import { useBriefGeneration } from "@/hooks/useBriefGeneration";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const TestBriefGeneration = () => {
  const { generating, logs, result, generateBrief } = useBriefGeneration();
  const logsEndRef = useRef<HTMLDivElement>(null);

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
        {result && result.success && (
          <div className="space-y-6">
            {/* Metadata */}
            {result.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle>Métadonnées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Avatar</div>
                      <div className="font-semibold">{result.metadata.avatar}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Voix</div>
                      <div className="font-semibold">{result.metadata.voice}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Records</div>
                      <div className="font-semibold">
                        {result.metadata.filtered_records} / {result.metadata.total_records}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Durée</div>
                      <div className="font-semibold">
                        {(result.metadata.generation_time_ms / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Player */}
            {result.audio_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Audio généré</CardTitle>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full" src={result.audio_url}>
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                </CardContent>
              </Card>
            )}

            {/* Brief Text */}
            {result.brief_text && (
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
                          {result.brief_text.introduction}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="analysis">
                      <AccordionTrigger>Analyse KPIs</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {result.brief_text.kpi_analysis}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="insights">
                      <AccordionTrigger>Insights</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {result.brief_text.insights}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    {result.brief_text.actions && result.brief_text.actions.length > 0 && (
                      <AccordionItem value="actions">
                        <AccordionTrigger>
                          Actions recommandées ({result.brief_text.actions.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {result.brief_text.actions.map((action, index) => (
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
                          {result.brief_text.conclusion}
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
