import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("initialize-avatar-voices");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    logger.info("Fetching French voices from ElevenLabs API");

    // Fetch voices from ElevenLabs
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { 
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      logger.error("ElevenLabs API error", { status: response.status });
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info("Fetched voices from ElevenLabs", { voicesCount: data.voices.length });
    
    // Filter for French voices - comprehensive search
    const frenchVoices = data.voices.filter((v: any) => {
      const language = v.labels?.language?.toLowerCase() || "";
      const accent = v.labels?.accent?.toLowerCase() || "";
      const name = v.name?.toLowerCase() || "";
      const description = (v.description?.toLowerCase() || "");
      
      // Popular French voice names from ElevenLabs
      const popularFrenchVoices = ["natasha", "francesca", "iris", "dorothée", "dorothee", "tchad", "aaron", "adam", "emily", "chloe"];
      const hasPopularName = popularFrenchVoices.some(n => name.includes(n));
      
      // Check language, accent, description or popular names
      return language.includes("fr") || 
             language.includes("french") || 
             accent.includes("french") ||
             description.includes("french") ||
             description.includes("français") ||
             hasPopularName;
    });

    logger.info("French voices filtered", { 
      frenchVoicesCount: frenchVoices.length,
      totalVoices: data.voices.length,
      voiceNames: frenchVoices.map((v: any) => v.name).slice(0, 10).join(", ")
    });

    // Use all French voices found
    const uniqueVoices = frenchVoices;

    // Initialize Supabase with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, sync voices to elevenlabs_voices table
    const voicesToUpsert = uniqueVoices.map((voice: any) => ({
      id: voice.voice_id,
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url || null,
      category: voice.category || null,
      labels: voice.labels || {},
      description: voice.description || null,
      language: voice.labels?.language || "fr",
      gender: voice.labels?.gender || null,
      updated_at: new Date().toISOString()
    }));

    logger.info("Upserting voices to database", { voicesCount: voicesToUpsert.length });
    const { data: upsertedVoices, error: upsertError } = await supabaseClient
      .from("elevenlabs_voices")
      .upsert(voicesToUpsert, { onConflict: "voice_id" })
      .select();

    if (upsertError) {
      logger.error("Database upsert error", { error: upsertError.message });
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: upsertedVoices?.length || 0,
        voices: upsertedVoices || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Error initializing avatar voices", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return new Response(
      JSON.stringify({ 
        error: "Failed to initialize avatar voices",
        message: "Unable to map avatars to voices. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
