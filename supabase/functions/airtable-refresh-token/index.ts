import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`Refreshing Airtable token for user: ${user.id}`);

    // Récupérer le refresh token actuel
    const { data: connection, error: connError } = await supabase
      .from("connections_airtable")
      .select("refresh_token_encrypted")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection?.refresh_token_encrypted) {
      throw new Error("Airtable connection or refresh token not found");
    }

    // Rafraîchir le token avec l'API Airtable
    const tokenResponse = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${Deno.env.get("AIRTABLE_CLIENT_ID")}:${Deno.env.get("AIRTABLE_CLIENT_SECRET")}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token_encrypted,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh failed:", errorText);
      throw new Error(`Failed to refresh token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Calculer la nouvelle date d'expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Mettre à jour le token dans la base de données
    const { error: updateError } = await supabase
      .from("connections_airtable")
      .update({
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || connection.refresh_token_encrypted,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update token:", updateError);
      throw updateError;
    }

    console.log("Token refreshed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in airtable-refresh-token:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
