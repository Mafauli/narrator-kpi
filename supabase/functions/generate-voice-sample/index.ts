import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log(`Generating voice sample for voice_id: ${voice_id}`);

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
      const errorText = await response.text();
      console.error("ElevenLabs TTS error status:", response.status);
      console.error("Voice ID used:", voice_id);
      console.error("Text length:", sampleText.length);
      // Don't expose API key or full error to logs
      throw new Error(`ElevenLabs TTS error (${response.status})`);
    }

    console.log("Voice sample generated successfully");

    // Return audio stream
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      }
    });

  } catch (error) {
    console.error("Error generating sample:", error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la génération audio";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
