import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { domain, data, customPrompt } = await req.json();
    
    if (!domain || !data) {
      throw new Error("domain and data are required");
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    // Construire le prompt système
    const systemPrompt = customPrompt || `Tu es expert dans ${domain}. 
Analyse les données suivantes et rédige un texte synthétique clair et professionnel destiné à un public non expert.
Le texte doit durer environ 1 minute 30 à 2 minutes à l'oral (environ 200-300 mots).
Utilise un ton professionnel mais accessible, avec des phrases courtes et un vocabulaire simple.
Structure ton texte avec une introduction, les points clés, et une conclusion.`;

    console.log(`Generating brief text for domain: ${domain}`);

    // Appel à l'API DeepSeek (compatible OpenAI SDK)
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-reasoner", // R1 - meilleur rapport qualité/prix
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }
        ],
        temperature: 0.7,
        max_tokens: 800, // Suffisant pour 200-300 mots
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const generatedText = result.choices[0].message.content;

    console.log("Brief text generated successfully");
    console.log(`Text length: ${generatedText.length} characters`);

    return new Response(
      JSON.stringify({ 
        text: generatedText,
        model: "deepseek-reasoner",
        usage: result.usage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error generating brief text:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
