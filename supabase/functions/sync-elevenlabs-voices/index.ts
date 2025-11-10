import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log("Fetching voices from ElevenLabs API...");

    // Fetch voices from ElevenLabs
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { 
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.voices.length} voices from ElevenLabs`);
    
    // Filter for French voices only
    const frenchVoices = data.voices.filter((v: any) => 
      v.labels?.language === "fr" || v.labels?.language === "french"
    );

    console.log(`Found ${frenchVoices.length} French voices`);

    // Initialize Supabase with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Prepare voices for upsert
    const voicesToUpsert = frenchVoices.map((voice: any) => ({
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

    console.log("Upserting voices to database...");

    // Upsert into database
    const { data: upsertedVoices, error: upsertError } = await supabaseClient
      .from("elevenlabs_voices")
      .upsert(voicesToUpsert, { onConflict: "voice_id" })
      .select();

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw upsertError;
    }

    console.log(`Successfully synced ${upsertedVoices.length} voices`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: upsertedVoices.length,
        voices: upsertedVoices 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error syncing voices:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
