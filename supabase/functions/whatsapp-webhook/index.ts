import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const VERIFY_TOKEN = Deno.env.get("WEBHOOK_VERIFY_TOKEN");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle GET request for webhook verification from Meta
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('Webhook verification request:', { mode, token: token ? 'present' : 'missing', challenge: challenge ? 'present' : 'missing' });

    // Check if mode and token are valid
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      // Respond with the challenge token from the request
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      console.error('Webhook verification failed:', { mode, tokenMatch: token === VERIFY_TOKEN });
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle POST request for incoming WhatsApp events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Received WhatsApp webhook event:', JSON.stringify(body, null, 2));

      // Process status updates
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const statuses = change.value?.statuses;
          
          if (statuses && statuses.length > 0) {
            for (const status of statuses) {
              const messageId = status.id;
              const statusType = status.status; // sent, delivered, read, failed
              const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
              
              console.log(`Processing status update: ${statusType} for message ${messageId}`);
              
              // Update whatsapp_deliveries table
              const updateData: any = {
                status: statusType,
                updated_at: new Date().toISOString(),
              };
              
              if (statusType === 'sent') {
                updateData.sent_at = timestamp;
              } else if (statusType === 'delivered') {
                updateData.delivered_at = timestamp;
                updateData.status = 'delivered';
              } else if (statusType === 'read') {
                updateData.read_at = timestamp;
                updateData.status = 'read';
              } else if (statusType === 'failed') {
                const errors = status.errors || [];
                const errorMessage = errors.map((e: any) => 
                  `${e.title}: ${e.error_data?.details || e.message}`
                ).join('; ');
                updateData.status = 'failed';
                updateData.error_message = errorMessage;
              }
              
              const { error } = await supabase
                .from('whatsapp_deliveries')
                .update(updateData)
                .eq('message_id', messageId);
              
              if (error) {
                console.error(`Error updating delivery status: ${error.message}`);
              } else {
                console.log(`Successfully updated status to ${statusType} for message ${messageId}`);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
