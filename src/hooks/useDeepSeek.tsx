import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateBriefTextParams {
  domain: string;
  data: any;
  customPrompt?: string;
}

interface GenerateBriefTextResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const useDeepSeek = () => {
  const [generating, setGenerating] = useState(false);

  const generateBriefText = async ({ 
    domain, 
    data, 
    customPrompt 
  }: GenerateBriefTextParams): Promise<string | null> => {
    try {
      setGenerating(true);
      console.log("Generating brief text with Lovable AI...", { domain });
      
      const { data: result, error } = await supabase.functions.invoke<GenerateBriefTextResponse>(
        "generate-brief-text",
        {
          body: { domain, data, customPrompt },
        }
      );
      
      if (error) throw error;
      
      console.log("Brief text generated:", result);
      toast.success("Texte généré avec succès");
      
      return result.text;
    } catch (error) {
      console.error("Error generating brief text:", error);
      toast.error("Erreur lors de la génération du texte");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return { 
    generateBriefText,
    generating,
  };
};
