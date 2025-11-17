import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("admin-get-costs");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Forbidden: Admin role required');
    }

    // Get current date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Get AI costs from brief_generation_logs
    const { data: aiToday } = await supabase
      .from('brief_generation_logs')
      .select('deepseek_cost')
      .gte('created_at', todayStart);

    const { data: aiMonth } = await supabase
      .from('brief_generation_logs')
      .select('deepseek_cost')
      .gte('created_at', monthStart);

    const aiTodayCost = aiToday?.reduce((sum, log) => sum + Number(log.deepseek_cost || 0), 0) || 0;
    const aiMonthCost = aiMonth?.reduce((sum, log) => sum + Number(log.deepseek_cost || 0), 0) || 0;

    // 2. Get briefs count for ElevenLabs estimation
    const { data: briefsToday } = await supabase
      .from('briefs')
      .select('script_text')
      .gte('created_at', todayStart)
      .not('script_text', 'is', null);

    const { data: briefsMonth } = await supabase
      .from('briefs')
      .select('script_text')
      .gte('created_at', monthStart)
      .not('script_text', 'is', null);

    // Estimate ElevenLabs cost: ~1000 chars = 1 minute, $0.15/minute
    const estimateElevenLabsCost = (briefs: any[]) => {
      if (!briefs) return 0;
      const totalChars = briefs.reduce((sum, brief) => sum + (brief.script_text?.length || 0), 0);
      const minutes = totalChars / 1000;
      return minutes * 0.15;
    };

    const elevenLabsTodayCost = estimateElevenLabsCost(briefsToday || []);
    const elevenLabsMonthCost = estimateElevenLabsCost(briefsMonth || []);

    // 3. Get WhatsApp stats
    const { data: whatsappToday } = await supabase
      .from('whatsapp_deliveries')
      .select('status')
      .gte('created_at', todayStart);

    const { data: whatsappMonth } = await supabase
      .from('whatsapp_deliveries')
      .select('status')
      .gte('created_at', monthStart);

    // WhatsApp is free for service messages within 24h (which is our case)
    const whatsappTodayCost = 0;
    const whatsappMonthCost = 0;

    // 4. Get statistics
    const { count: briefsTodayCount } = await supabase
      .from('briefs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    const { count: briefsMonthCount } = await supabase
      .from('briefs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart);

    const { count: messagesSent } = await supabase
      .from('whatsapp_deliveries')
      .select('*', { count: 'exact', head: true });

    const { count: messagesDelivered } = await supabase
      .from('whatsapp_deliveries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['delivered', 'read']);

    const result = {
      today: {
        deepseek: aiTodayCost,
        elevenlabs: elevenLabsTodayCost,
        whatsapp: whatsappTodayCost,
        total: aiTodayCost + elevenLabsTodayCost + whatsappTodayCost,
      },
      month: {
        deepseek: aiMonthCost,
        elevenlabs: elevenLabsMonthCost,
        whatsapp: whatsappMonthCost,
        total: aiMonthCost + elevenLabsMonthCost + whatsappMonthCost,
      },
      stats: {
        briefs_today: briefsTodayCount || 0,
        briefs_month: briefsMonthCount || 0,
        messages_sent: messagesSent || 0,
        messages_delivered: messagesDelivered || 0,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error("Error calculating admin costs", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return new Response(
      JSON.stringify({ 
        error: "Failed to calculate costs",
        message: "Unable to retrieve cost data. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
