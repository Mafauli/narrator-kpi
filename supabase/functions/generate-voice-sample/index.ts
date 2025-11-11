import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("generate-voice-sample");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voice_id, text } = await req.json();
    
    if (!voice_id) {
      throw new Error("voice_id is required");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const sampleText = text || "Bonjour, je suis ton assistant virtuel. Prêt à booster ta semaine ?";

    logger.info("Generating voice sample", { voiceId: voice_id, textLength: sampleText.length });

    // Generate audio using ElevenLabs TTS
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: sampleText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.15
          }
        })
      }
    );

    if (!response.ok) {
      logger.error("ElevenLabs TTS error", { 
        status: response.status,
        voiceId: voice_id,
        textLength: sampleText.length
      });
      throw new Error(`ElevenLabs TTS error (${response.status})`);
    }

    logger.info("Voice sample generated successfully", { voiceId: voice_id });

    // Return audio stream
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      }
    });

  } catch (error) {
    logger.error("Error generating voice sample", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate voice sample",
        message: "Unable to generate audio. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
