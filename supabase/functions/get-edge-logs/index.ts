import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: { Authorization: authHeader },
      }
    });

    // Verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    const { function_name, search = "", limit = 100 } = await req.json();

    if (!function_name) {
      throw new Error('function_name is required');
    }

    console.log(`Fetching logs for function: ${function_name}`);

    // Query edge function logs from analytics
    // Note: This queries the Supabase edge function logs table
    const query = `
      select 
        id,
        function_edge_logs.timestamp,
        event_message,
        metadata.level as level,
        metadata.msg as msg,
        metadata.error as error
      from edge_logs
      cross join unnest(metadata) as metadata
      where metadata.function_id = '${function_name}'
      ${search ? `and (event_message ilike '%${search}%' or metadata.msg ilike '%${search}%')` : ''}
      order by timestamp desc
      limit ${limit}
    `;

    // For now, return logs from brief_generation_logs table if function is generate-brief-text
    if (function_name === 'generate-brief-text') {
      const { data: briefLogs, error: logsError } = await supabase
        .from('brief_generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;

      const formattedLogs = briefLogs?.map(log => ({
        timestamp: new Date(log.created_at).getTime(),
        level: 'info',
        event_type: 'Brief Generation',
        event_message: `Brief generated | Tokens: ${log.deepseek_tokens_input}/${log.deepseek_tokens_output} | Cost: $${log.deepseek_cost.toFixed(6)} | Duration: ${log.generation_duration_ms}ms`,
        metadata: {
          brief_id: log.brief_id,
          user_id: log.user_id,
          cost: log.deepseek_cost,
          tokens_input: log.deepseek_tokens_input,
          tokens_output: log.deepseek_tokens_output,
          duration_ms: log.generation_duration_ms
        }
      })) || [];

      return new Response(JSON.stringify({ logs: formattedLogs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For other functions, return empty for now (would need Supabase Analytics API access)
    console.log(`No specific log handler for ${function_name}, returning placeholder`);
    
    return new Response(JSON.stringify({ 
      logs: [],
      message: `Les logs en temps réel pour ${function_name} ne sont pas encore disponibles. Consultez les logs via le Cloud pour plus de détails.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[get-edge-logs] Error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      logs: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});