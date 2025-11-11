import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const { domain, data, customPrompt, targetDurationMinutes = 2, briefId, userId } = await req.json();
    
    if (!domain || !data) {
      throw new Error("domain and data are required");
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    console.log(`Generating brief text for domain: ${domain}`);
    console.log(`Target duration: ${targetDurationMinutes} minutes`);

    // Fetch system prompt from database if no custom prompt provided
    let systemPrompt = customPrompt;
    
    if (!customPrompt && authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: promptData } = await supabase
          .from('system_prompts')
          .select('prompt_text')
          .eq('name', 'brief-text-generation')
          .eq('is_active', true)
          .maybeSingle();

        if (promptData?.prompt_text) {
          systemPrompt = promptData.prompt_text;
        }
      } catch (error) {
        console.error('Error fetching system prompt:', error);
      }
    }

    // Calculate dynamic max_tokens based on target duration
    // Average speaking rate: ~150 words/minute in French
    // 1 token ≈ 0.75 words for French
    const targetWords = targetDurationMinutes * 150;
    const maxTokens = Math.ceil(targetWords * 1.5); // 1.5x safety margin

    console.log(`Target words: ${targetWords}, Max tokens: ${maxTokens}`);

    // Construire le prompt système - texte simple et direct
    const wordLimit = Math.ceil(targetWords * 1.1); // Allow 10% overflow
    
    // If no system prompt was found, use default
    if (!systemPrompt) {
      systemPrompt = `Tu es expert dans ${domain}. 
Génère un texte fluide et naturel prêt à être lu à voix haute.

RÈGLES STRICTES:
- Réponds UNIQUEMENT avec le texte du brief
- AUCUN formatage, AUCUN markdown, AUCUNE balise
- Texte direct pour synthèse vocale
- Style oral et conversationnel
- Ne dépasse jamais ${wordLimit} mots`;
    }

    // Replace variables in prompt
    systemPrompt = systemPrompt
      .replace(/\{\{domain\}\}/g, domain)
      .replace(/\{\{wordLimit\}\}/g, wordLimit.toString())
      .replace(/\{\{targetWords\}\}/g, targetWords.toString());

    console.log(`Brief generation started for ${domain}`);

    const generationStartTime = Date.now();

    // Appel à l'API DeepSeek avec modèle rapide
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const generatedText = result.choices[0].message.content.trim();
    
    const generationDuration = Date.now() - generationStartTime;

    console.log("Brief text generated successfully");
    console.log(`Text length: ${generatedText.length} characters`);

    // Log to brief_generation_logs for cost tracking and prompt analysis
    if (authHeader && userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const inputTokens = result.usage?.prompt_tokens || 0;
        const outputTokens = result.usage?.completion_tokens || 0;
        
        // Calculate cost: $0.28/1M input tokens, $0.42/1M output tokens
        const cost = (inputTokens * 0.28 / 1_000_000) + (outputTokens * 0.42 / 1_000_000);

        await supabase
          .from('brief_generation_logs')
          .insert({
            brief_id: briefId || null,
            user_id: userId,
            prompt_text_used: systemPrompt,
            deepseek_response_full: generatedText,
            deepseek_tokens_input: inputTokens,
            deepseek_tokens_output: outputTokens,
            deepseek_cost: cost,
            generation_duration_ms: generationDuration,
          });

        console.log(`Cost logged: $${cost.toFixed(6)} (${inputTokens}/${outputTokens} tokens)`);
      } catch (logError) {
        console.error('Error logging to brief_generation_logs:', logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ 
        text: generatedText,
        model: "deepseek-chat",
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
