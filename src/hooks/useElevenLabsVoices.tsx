import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ElevenLabsVoice {
  id: string;
  voice_id: string;
  name: string;
  preview_url: string | null;
  language: string;
  gender: string | null;
  category: string | null;
  description: string | null;
}

export const useElevenLabsVoices = () => {
  const [syncing, setSyncing] = useState(false);

  const { data: voices = [], isLoading, refetch } = useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elevenlabs_voices")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as ElevenLabsVoice[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const syncVoices = async () => {
    try {
      setSyncing(true);
      console.log("Starting voice sync...");
      
      const { data, error } = await supabase.functions.invoke("sync-elevenlabs-voices");
      
      if (error) throw error;
      
      console.log("Sync response:", data);
      toast.success(`${data.count} voix synchronisées`);
      await refetch();
    } catch (error) {
      console.error("Error syncing voices:", error);
      toast.error("Erreur lors de la synchronisation des voix");
    } finally {
      setSyncing(false);
    }
  };

  return { 
    voices, 
    loading: isLoading, 
    syncing,
    syncVoices, 
    refetch 
  };
};
