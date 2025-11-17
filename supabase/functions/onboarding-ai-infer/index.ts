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
  samples: z.array(z.any()),
  force_refresh: z.boolean().optional()
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

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper to create a hash from data for cache key
const createDataHash = async (data: any): Promise<string> => {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

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
    
    // Parallelize: start fetching system prompt early
    const systemPromptPromise = getSystemPrompt(supabase);

    // Validate request based on phase
    let phase: string;
    let lang: string;
    let tz: string;
    let views_schema: any;
    let samples: any;
    let prior_inference: any;
    let user_reply_raw: string | undefined;
    let force_refresh = false;
    
    try {
      if (requestBody.phase === 'infer') {
        const validated = inferSchema.parse(requestBody);
        phase = validated.phase;
        lang = validated.lang;
        tz = validated.tz;
        views_schema = validated.views_schema;
        samples = validated.samples;
        force_refresh = validated.force_refresh || false;
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

    logger.info("Onboarding AI inference started", { phase, userId: user.id });

    // Await the system prompt that was fetched in parallel
    const systemPrompt = await systemPromptPromise;
    logger.info("System prompt fetched", { promptLength: systemPrompt.length });

    // Check cache for infer phase (hash-based + timestamp)
    if (phase === 'infer' && !force_refresh) {
      const dataHash = await createDataHash({ views_schema, samples });
      
      const { data: cachedOnboarding } = await supabase
        .from('onboarding')
        .select('infer_json, updated_at')
        .eq('user_id', user.id)
        .single();

      if (cachedOnboarding?.infer_json) {
        const cacheAge = Date.now() - new Date(cachedOnboarding.updated_at).getTime();
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours (reduced from 72)
        
        // Check if cached data matches current data hash
        const cachedHash = cachedOnboarding.infer_json?.data_hash;

        if (cacheAge < maxCacheAge && cachedHash === dataHash) {
          logger.info("Returning cached infer_json", { 
            cacheAgeHours: (cacheAge / (60 * 60 * 1000)).toFixed(1),
            dataHash 
          });
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
      
      // Log data being sent
      logger.info("Infer phase data prepared", {
        viewsCount: views_schema?.length || 0,
        samplesCount: samples?.length || 0,
        viewsSchemaPreview: JSON.stringify(views_schema).substring(0, 500),
        samplesPreview: JSON.stringify(samples).substring(0, 500)
      });
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
      
      logger.info("Refine phase data prepared", {
        userReplyLength: user_reply_raw?.length || 0
      });
    }

    // Log the complete request to Lovable AI
    const aiRequestBody = {
      model: 'google/gemini-2.5-flash', // Fast and efficient model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userMessage) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    };
    
    logger.info("Sending request to Lovable AI", {
      model: 'google/gemini-2.5-flash',
      systemPromptLength: systemPrompt.length,
      userMessageLength: JSON.stringify(userMessage).length
    });

    // Call Lovable AI Gateway (much faster than DeepSeek)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody),
    });

    if (!aiResponse.ok) {
      logger.error("Lovable AI API error", { 
        status: aiResponse.status,
        phase
      });
      
      // Provide specific error messages based on status code
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        throw new Error('Configuration AI incorrecte. Contacte l\'administrateur.');
      } else if (aiResponse.status === 429) {
        throw new Error('Trop de requêtes AI. Patiente quelques secondes.');
      } else if (aiResponse.status === 402) {
        throw new Error('Crédits AI épuisés. Contacte l\'administrateur.');
      }
      
      throw new Error(`Erreur AI (${aiResponse.status}). Réessaye plus tard.`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;
    
    logger.info("Lovable AI response received", { 
      phase, 
      responseLength: responseText.length,
      tokensUsed: aiData.usage?.total_tokens || 0
    });

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      logger.error("Failed to parse AI JSON response", { 
        error: e instanceof Error ? e.message : "Unknown error" 
      });
      throw new Error('Invalid JSON response from AI');
    }

    // Save to onboarding table
    if (phase === 'infer') {
      // Add data hash to cached response
      const dataHash = await createDataHash({ views_schema, samples });
      parsedResponse.data_hash = dataHash;
      
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
        logger.error("Error saving infer_json", { error: insertError.message });
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
        logger.error("Error saving final_context", { error: updateError.message });
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
