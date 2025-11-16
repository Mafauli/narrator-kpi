import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceId, text, avatarId } = await req.json();
    
    if (!voiceId || !text) {
      throw new Error("voiceId and text are required");
    }

    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    console.log(`Generating audio sample for avatar ${avatarId} with voice ${voiceId}`);

    // Générer l'audio via ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    // Récupérer l'audio
    const audioBlob = await response.arrayBuffer();
    
    // Uploader dans Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `${avatarId}-sample.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("briefs-audio")
      .upload(`avatar-samples/${fileName}`, audioBlob, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from("briefs-audio")
      .getPublicUrl(`avatar-samples/${fileName}`);

    console.log(`Audio sample generated and uploaded: ${urlData.publicUrl}`);

    // Mettre à jour l'avatar dans la base de données si avatarId est fourni
    if (avatarId) {
      const { error: updateError } = await supabase
        .from("avatars")
        .update({ sample_audio_url: urlData.publicUrl })
        .eq("id", avatarId);

      if (updateError) {
        console.error("Error updating avatar:", updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioUrl: urlData.publicUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating avatar sample:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
