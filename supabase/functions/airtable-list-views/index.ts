import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    console.log('Auth header present:', !!authHeader);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { baseId, tableId } = await req.json();
    if (!baseId || !tableId) {
      throw new Error('Missing baseId or tableId');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get access token - RLS automatically filters by user_id from JWT
    const { data: connection, error: connError } = await supabase
      .from('connections_airtable')
      .select('access_token_encrypted, refresh_token_encrypted, id')
      .maybeSingle();
    
    console.log('Connection query result:', { hasConnection: !!connection, error: connError?.message });

    if (connError) {
      console.error('Database error:', connError);
      throw new Error('Database error');
    }

    if (!connection) {
      throw new Error('Airtable not connected');
    }

    let accessToken = connection.access_token_encrypted;

    // Function to refresh token if needed
    const refreshToken = async () => {
      if (!connection.refresh_token_encrypted) {
        console.error('No refresh token available');
        throw new Error('Token expired. Please reconnect to Airtable');
      }

      console.log('Attempting to refresh Airtable token...');
      
      const AIRTABLE_CLIENT_ID = Deno.env.get('AIRTABLE_CLIENT_ID');
      const AIRTABLE_CLIENT_SECRET = Deno.env.get('AIRTABLE_CLIENT_SECRET');

      if (!AIRTABLE_CLIENT_ID || !AIRTABLE_CLIENT_SECRET) {
        throw new Error('Airtable OAuth credentials not configured');
      }

      const refreshResponse = await fetch('https://airtable.com/oauth2/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token_encrypted,
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', errorText);
        throw new Error('Token expired. Please reconnect to Airtable');
      }

      const tokenData = await refreshResponse.json();
      console.log('Token refreshed successfully');

      // Update token in database
      const { error: updateError } = await supabase
        .from('connections_airtable')
        .update({
          access_token_encrypted: tokenData.access_token,
          refresh_token_encrypted: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);

      if (updateError) {
        console.error('Failed to update token:', updateError);
      }

      return tokenData.access_token;
    };

    // Fetch table schema including views
    let response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      console.log('Token expired, refreshing...');
      accessToken = await refreshToken();
      
      // Retry with new token
      response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      throw new Error('Failed to fetch views');
    }

    const data = await response.json();
    const table = data.tables?.find((t: any) => t.id === tableId);
    
    if (!table) {
      throw new Error('Table not found');
    }

    console.log('Views fetched for table:', table.name, table.views?.length || 0);

    return new Response(
      JSON.stringify({ views: table.views || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error listing views:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
