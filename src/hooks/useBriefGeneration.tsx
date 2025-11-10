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

      const { data, error } = await supabase.functions.invoke<BriefResult>(
        "generate-complete-brief",
        {
          body: {},
        }
      );

      if (error) throw error;

      if (data.logs) {
        setLogs(data.logs);
      }

      setResult(data);

      if (data.success) {
        toast.success("Brief généré avec succès !");
      } else {
        toast.error(data.error || "Erreur lors de la génération du brief");
      }

      return data;
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
