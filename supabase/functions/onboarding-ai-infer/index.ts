import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("onboarding-ai-infer");

// Validation schemas
const inferSchema = z.object({
  phase: z.literal('infer'),
  lang: z.string().default('fr'),
  tz: z.string().default('Europe/Paris'),
  views_schema: z.array(z.any()),
  samples: z.array(z.any())
});

const refineSchema = z.object({
  phase: z.literal('refine'),
  lang: z.string().default('fr'),
  tz: z.string().default('Europe/Paris'),
  prior_inference: z.any(),
  user_reply_raw: z.string().max(2000, 'User reply too long (max 2000 characters)')
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Fetch system prompt from database
const getSystemPrompt = async (supabase: any): Promise<string> => {
  const { data: promptData } = await supabase
    .from('system_prompts')
    .select('prompt_text')
    .eq('name', 'onboarding-ai-infer')
    .eq('is_active', true)
    .maybeSingle();

  if (!promptData?.prompt_text) {
    throw new Error('Active system prompt not found for onboarding-ai-infer');
  }

  return promptData.prompt_text;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: { Authorization: authHeader },
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    
    // Validate request based on phase
    let phase: string;
    let lang: string;
    let tz: string;
    let views_schema: any;
    let samples: any;
    let prior_inference: any;
    let user_reply_raw: string | undefined;
    
    try {
      if (requestBody.phase === 'infer') {
        const validated = inferSchema.parse(requestBody);
        phase = validated.phase;
        lang = validated.lang;
        tz = validated.tz;
        views_schema = validated.views_schema;
        samples = validated.samples;
      } else if (requestBody.phase === 'refine') {
        const validated = refineSchema.parse(requestBody);
        phase = validated.phase;
        lang = validated.lang;
        tz = validated.tz;
        prior_inference = validated.prior_inference;
        user_reply_raw = validated.user_reply_raw;
      } else {
        throw new Error('Invalid phase. Must be "infer" or "refine"');
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        throw new Error(`Validation error: ${validationError.errors[0].message}`);
      }
      throw validationError;
    }

    console.log(`[onboarding-ai-infer] Phase: ${phase}, User: ${user.id}`);

    // Fetch system prompt from database
    const systemPrompt = await getSystemPrompt(supabase);

    // Check cache for infer phase
    if (phase === 'infer') {
      const { data: cachedOnboarding } = await supabase
        .from('onboarding')
        .select('infer_json, updated_at')
        .eq('user_id', user.id)
        .single();

      if (cachedOnboarding?.infer_json) {
        const cacheAge = Date.now() - new Date(cachedOnboarding.updated_at).getTime();
        const maxCacheAge = 72 * 60 * 60 * 1000; // 72 hours

        if (cacheAge < maxCacheAge) {
          console.log('[onboarding-ai-infer] Returning cached infer_json');
          return new Response(JSON.stringify(cachedOnboarding.infer_json), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    let userMessage: any;
    
    if (phase === 'infer') {
      if (!views_schema || !samples) {
        throw new Error('Missing views_schema or samples for infer phase');
      }
      userMessage = {
        phase: 'infer',
        lang,
        tz,
        views_schema,
        samples
      };
    } else {
      if (!prior_inference || !user_reply_raw) {
        throw new Error('Missing prior_inference or user_reply_raw for refine phase');
      }
      userMessage = {
        phase: 'refine',
        lang,
        tz,
        prior_inference,
        user_reply_raw
      };
    }

    // Call DeepSeek
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userMessage) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('[onboarding-ai-infer] DeepSeek error status:', deepseekResponse.status);
      console.error('[onboarding-ai-infer] Error details:', errorText.substring(0, 200));
      
      // Provide specific error messages based on status code
      if (deepseekResponse.status === 401 || deepseekResponse.status === 403) {
        throw new Error('Clé API DeepSeek invalide ou expirée. Contacte l\'administrateur.');
      } else if (deepseekResponse.status === 404) {
        throw new Error('Service DeepSeek temporairement indisponible. Réessaye dans quelques instants.');
      } else if (deepseekResponse.status === 429) {
        throw new Error('Trop de requêtes DeepSeek. Patiente quelques secondes.');
      }
      
      throw new Error(`Erreur DeepSeek (${deepseekResponse.status}). Réessaye plus tard.`);
    }

    const deepseekData = await deepseekResponse.json();
    const responseText = deepseekData.choices[0].message.content;
    
    console.log('[onboarding-ai-infer] DeepSeek response length:', responseText.length);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('[onboarding-ai-infer] Failed to parse JSON:', e);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    // Save to onboarding table
    if (phase === 'infer') {
      const { error: insertError } = await supabase
        .from('onboarding')
        .upsert({
          user_id: user.id,
          infer_json: parsedResponse,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (insertError) {
        console.error('[onboarding-ai-infer] Error saving infer_json:', insertError);
      }
    } else {
      const { error: updateError } = await supabase
        .from('onboarding')
        .update({
          final_context: parsedResponse,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[onboarding-ai-infer] Error saving final_context:', updateError);
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logger.error("Error in onboarding AI inference", { 
      error: error.message || 'Unknown error',
      phase: error.phase || 'unknown'
    });
    
    // Provide user-friendly error messages without exposing technical details
    let userMessage = 'Une erreur est survenue lors de l\'analyse. Réessaye dans quelques instants.';
    
    if (error.message?.includes('Clé API') || error.message?.includes('API KEY')) {
      userMessage = 'Configuration API incorrecte. Contacte l\'administrateur.';
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      userMessage = 'Service temporairement surchargé. Patiente quelques secondes.';
    } else if (error.message?.includes('Unauthorized') || error.message?.includes('authorization')) {
      userMessage = 'Session expirée. Reconnecte-toi.';
    }
    
    return new Response(JSON.stringify({ 
      error: userMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
