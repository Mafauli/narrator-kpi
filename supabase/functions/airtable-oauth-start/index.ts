import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64urlEncode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('AIRTABLE_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/airtable-oauth-callback`;
    
    const { userId, state } = await req.json();

    if (!userId || !state) {
      throw new Error('Missing userId or state');
    }

    // Generate PKCE code_verifier (random 43-128 chars)
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate code_challenge (SHA256 of code_verifier, base64url encoded)
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = base64urlEncode(hashBuffer);

    const authUrl = new URL('https://airtable.com/oauth2/v1/authorize');
    authUrl.searchParams.set('client_id', clientId!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'data.records:read schema.bases:read');
    authUrl.searchParams.set('state', `${state}:${codeVerifier}`);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('OAuth start URL:', authUrl.toString());
    console.log('Code verifier stored in state');

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting OAuth:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
