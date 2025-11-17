import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("whatsapp-webhook");

const VERIFY_TOKEN = Deno.env.get("WEBHOOK_VERIFY_TOKEN");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // max 100 requests per minute per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const now = Date.now();
  
  const rateLimit = requestCounts.get(clientIp);
  if (rateLimit) {
    if (now < rateLimit.resetTime) {
      if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        logger.warn('Rate limit exceeded', { ip: clientIp });
        return new Response('Rate limit exceeded', { status: 429 });
      }
      rateLimit.count++;
    } else {
      requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }
  } else {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  const url = new URL(req.url);

  // Handle GET request for webhook verification from Meta
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    logger.info('Webhook verification request', { 
      mode, 
      has_token: !!token, 
      has_challenge: !!challenge 
    });

    // Check if mode and token are valid
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('Webhook verified successfully', { ip: clientIp });
      // Respond with the challenge token from the request
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      logger.warn('Webhook verification failed - invalid token', { 
        ip: clientIp,
        mode, 
        has_verify_token: !!VERIFY_TOKEN
      });
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle POST request for incoming WhatsApp events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // Validate webhook payload structure
      if (!body.entry || !Array.isArray(body.entry)) {
        logger.warn('Invalid webhook payload - missing or invalid entry array', { ip: clientIp });
        return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      logger.info('Received WhatsApp webhook event', { 
        ip: clientIp,
        entries_count: body.entry.length 
      });

      // Process status updates
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const statuses = change.value?.statuses;
          
          if (statuses && statuses.length > 0) {
            for (const status of statuses) {
              // Validate message ID format (should be alphanumeric with dots, underscores, and dashes)
              const messageId = status.id;
              if (!messageId || typeof messageId !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(messageId)) {
                logger.warn('Invalid message ID format', { message_id: messageId, ip: clientIp });
                continue;
              }
              
              const statusType = status.status; // sent, delivered, read, failed
              
              // Validate status type
              const validStatuses = ['sent', 'delivered', 'read', 'failed'];
              if (!validStatuses.includes(statusType)) {
                logger.warn('Invalid status type', { status: statusType, message_id: messageId });
                continue;
              }
              
              const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
              
              logger.info('Processing status update', { 
                status: statusType, 
                message_id: messageId 
              });
              
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
                logger.error('Error updating delivery status', { 
                  message_id: messageId, 
                  error: error.message 
                });
              } else {
                logger.info('Status updated successfully', { 
                  status: statusType, 
                  message_id: messageId 
                });
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
      logger.error('Error processing webhook', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
