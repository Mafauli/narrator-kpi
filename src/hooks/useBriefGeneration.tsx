import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogEvent {
  timestamp: number;
  type: "info" | "success" | "error" | "warning";
  icon: string;
  message: string;
  details?: string;
}

interface BriefResult {
  success: boolean;
  brief_id?: string;
  brief_text?: {
    introduction: string;
    kpi_analysis: string;
    insights: string;
    actions: Array<{
      title: string;
      why: string;
      how: string;
      priority: string;
    }>;
    conclusion: string;
  };
  audio_url?: string;
  logs?: LogEvent[];
  metadata?: {
    total_records: number;
    filtered_records: number;
    estimated_tokens: number;
    generation_time_ms: number;
    avatar: string;
    voice: string;
  };
  error?: string;
}

export const useBriefGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [result, setResult] = useState<BriefResult | null>(null);

  const generateBrief = async () => {
    try {
      setGenerating(true);
      setLogs([]);
      setResult(null);

      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Non authentifié");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const authToken = session.access_token;

      // Utiliser fetch au lieu de EventSource pour pouvoir passer l'auth header
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-complete-brief-stream`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'text/event-stream',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: BriefResult | null = null;

      // Lire le stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();
            continue;
          }
          
          if (line.startsWith('data:')) {
            const data = line.substring(5).trim();
            
            try {
              const parsedData = JSON.parse(data);
              
              // Identifier le type d'événement par le contenu
              if (parsedData.timestamp) {
                // C'est un log
                setLogs((prev) => [...prev, parsedData as LogEvent]);
              } else if (parsedData.success !== undefined) {
                // C'est le résultat final
                finalResult = parsedData as BriefResult;
                setResult(finalResult);
              } else if (parsedData.error) {
                // C'est une erreur
                const errorResult: BriefResult = {
                  success: false,
                  error: parsedData.error,
                };
                setResult(errorResult);
                toast.error(errorResult.error);
                break;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", data, e);
            }
          }
        }
      }

      if (finalResult?.success) {
        toast.success("Brief généré avec succès !");
        return finalResult;
      } else if (finalResult) {
        toast.error(finalResult.error || "Erreur lors de la génération du brief");
        return finalResult;
      }

      return null;
    } catch (error) {
      console.error("Error generating brief:", error);
      toast.error("Erreur lors de la génération du brief");
      
      const errorResult: BriefResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      
      setResult(errorResult);
      return errorResult;
    } finally {
      setGenerating(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResult(null);
  };

  return {
    generating,
    logs,
    result,
    generateBrief,
    clearLogs,
  };
};
