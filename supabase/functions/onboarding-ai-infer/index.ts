import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

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

    const { phase, lang = 'fr', tz = 'Europe/Paris', views_schema, samples, prior_inference, user_reply_raw } = await req.json();

    if (!phase || !['infer', 'refine'].includes(phase)) {
      throw new Error('Invalid phase. Must be "infer" or "refine"');
    }
    
    // Validation: user_reply_raw length
    if (phase === 'refine' && user_reply_raw && user_reply_raw.length > 1000) {
      throw new Error('User reply too long (max 1000 characters)');
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
      // Don't log full error text as it might contain sensitive data
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
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
    console.error('[onboarding-ai-infer] Error:', error.message || 'Unknown error');
    // Don't expose internal error details to client
    const userMessage = error.message?.includes('API') || error.message?.includes('Invalid') 
      ? error.message 
      : 'Erreur lors de l\'analyse. Réessaye dans quelques instants.';
    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
