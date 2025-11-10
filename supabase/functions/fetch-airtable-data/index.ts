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

    console.log(`Fetching Airtable data for user: ${user.id}`);

    // Récupérer les vues actives de l'utilisateur
    const { data: views, error: viewsError } = await supabase
      .from("airtable_views")
      .select("*")
      .eq("user_id", user.id)
      .eq("enabled", true);

    if (viewsError) throw viewsError;

    if (!views || views.length === 0) {
      return new Response(
        JSON.stringify({ 
          views: [], 
          total_records: 0,
          message: "No active Airtable views configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${views.length} active views`);

    // Récupérer le token Airtable
    const { data: connection, error: connError } = await supabase
      .from("connections_airtable")
      .select("access_token_encrypted, expires_at")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: "Airtable connection not found",
          error_type: "no_connection",
          message: "Please reconnect your Airtable account"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = connection.access_token_encrypted;
    
    // Vérifier si le token est expiré
    const isTokenExpired = connection.expires_at && new Date(connection.expires_at) < new Date();
    if (isTokenExpired) {
      console.log("Token expired, attempting to refresh...");
      
      try {
        const refreshResponse = await supabase.functions.invoke("airtable-refresh-token", {
          headers: { Authorization: authHeader }
        });

        if (refreshResponse.error || !refreshResponse.data?.success) {
          throw new Error("Token refresh failed");
        }

        // Récupérer le nouveau token
        const { data: newConnection } = await supabase
          .from("connections_airtable")
          .select("access_token_encrypted")
          .eq("user_id", user.id)
          .single();

        if (newConnection) {
          accessToken = newConnection.access_token_encrypted;
          console.log("Token refreshed successfully");
        }
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        return new Response(
          JSON.stringify({ 
            error: "Airtable authentication expired",
            error_type: "token_expired",
            message: "Please reconnect your Airtable account"
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Récupérer les données de chaque vue
    const viewsData = [];
    let totalRecords = 0;

    for (const view of views) {
      try {
        console.log(`Fetching data from ${view.base_name} / ${view.table_name} / ${view.view_name}`);
        
        // Appel à l'API Airtable
        const url = `https://api.airtable.com/v0/${view.base_id}/${encodeURIComponent(view.table_name)}?view=${encodeURIComponent(view.view_name)}`;
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Airtable API error for view ${view.view_name}:`, {
            status: response.status,
            error: errorText
          });
          
          // Si erreur 401, tenter de rafraîchir le token
          if (response.status === 401) {
            console.log("Received 401, attempting token refresh...");
            
            try {
              const refreshResponse = await supabase.functions.invoke("airtable-refresh-token", {
                headers: { Authorization: authHeader }
              });

              if (refreshResponse.data?.success) {
                // Récupérer le nouveau token et réessayer
                const { data: newConnection } = await supabase
                  .from("connections_airtable")
                  .select("access_token_encrypted")
                  .eq("user_id", user.id)
                  .single();

                if (newConnection) {
                  accessToken = newConnection.access_token_encrypted;
                  
                  // Réessayer la requête avec le nouveau token
                  const retryResponse = await fetch(url, {
                    headers: {
                      "Authorization": `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                  });

                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    const retryRecords = retryData.records || [];

                    viewsData.push({
                      base_name: view.base_name,
                      table_name: view.table_name,
                      view_name: view.view_name,
                      records: retryRecords,
                      record_count: retryRecords.length,
                    });

                    totalRecords += retryRecords.length;
                    console.log(`Retrieved ${retryRecords.length} records from ${view.view_name} after token refresh`);
                    continue;
                  }
                }
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
            }
            
            // Si on arrive ici, la reconnexion a échoué
            return new Response(
              JSON.stringify({ 
                error: "Airtable authentication failed",
                error_type: "auth_failed",
                message: "Your Airtable connection has expired. Please reconnect your account.",
                views: [],
                total_records: 0
              }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          continue;
        }

        const data = await response.json();
        const records = data.records || [];

        viewsData.push({
          base_name: view.base_name,
          table_name: view.table_name,
          view_name: view.view_name,
          records: records,
          record_count: records.length,
        });

        totalRecords += records.length;
        console.log(`Retrieved ${records.length} records from ${view.view_name}`);

      } catch (error) {
        console.error(`Error fetching view ${view.view_name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        views: viewsData,
        total_records: totalRecords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-airtable-data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
