import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(`
        <html>
          <head>
            <style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
              .message { text-align: center; }
              .error { color: #ef4444; font-size: 24px; margin-bottom: 12px; }
            </style>
          </head>
          <body>
            <div class="message">
              <div class="error">✗ Erreur</div>
              <p>Vous pouvez fermer cette fenêtre</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'airtable-oauth-error', error: '${error}' }, '*');
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // Parse state to get userId and code_verifier
    const [userId, codeVerifier] = state.split(':');
    
    if (!userId || !codeVerifier) {
      throw new Error('Invalid state format');
    }

    // Exchange code for token
    const clientId = Deno.env.get('AIRTABLE_CLIENT_ID');
    const clientSecret = Deno.env.get('AIRTABLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/airtable-oauth-callback`;

    const tokenResponse = await fetch('https://airtable.com/oauth2/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received, expires in:', tokenData.expires_in);

    // Store token in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('connections_airtable')
      .upsert({
        user_id: userId,
        provider: 'airtable',
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token,
        scopes: tokenData.scope,
        expires_at: expiresAt,
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Connection saved successfully');

    // Return HTML that redirects to onboarding step 2
    return new Response(`
      <html>
        <head>
          <style>
            body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .message { text-align: center; }
            .success { color: #22c55e; font-size: 24px; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="message">
            <div class="success">✓ Connexion réussie</div>
            <p>Redirection en cours...</p>
          </div>
          <script>
            // Redirect using relative URL - works on any domain (preview, production, custom)
            window.location.href = '/app/onboarding?step=2&airtable_connected=true';
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(`
      <html>
        <head>
          <style>
            body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .message { text-align: center; }
            .error { color: #ef4444; font-size: 24px; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="message">
            <div class="error">✗ Erreur de connexion</div>
            <p>Vous pouvez fermer cette fenêtre</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'airtable-oauth-error', error: '${(error as Error).message}' }, '*');
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});
