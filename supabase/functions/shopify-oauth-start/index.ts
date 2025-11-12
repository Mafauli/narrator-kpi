import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("shopify-oauth-start");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain } = await req.json();
    
    if (!shopDomain) {
      throw new Error("Shop domain is required");
    }

    const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
    const redirectUri = `${appUrl}/app/sources?shopify=connected`;

    if (!clientId) {
      logger.error("SHOPIFY_CLIENT_ID not configured");
      throw new Error("Shopify integration not configured");
    }

    // Normalize shop domain
    const normalizedDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const fullDomain = normalizedDomain.includes('.myshopify.com') 
      ? normalizedDomain 
      : `${normalizedDomain}.myshopify.com`;

    const scopes = 'read_orders,read_products,read_customers';
    const state = crypto.randomUUID();

    const authUrl = `https://${fullDomain}/admin/oauth/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    logger.info("OAuth flow initiated", { shopDomain: fullDomain });

    return new Response(
      JSON.stringify({ 
        authUrl, 
        state,
        shopDomain: fullDomain
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in shopify-oauth-start", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
