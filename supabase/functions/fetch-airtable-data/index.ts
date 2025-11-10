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
      .select("access_token_encrypted")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      throw new Error("Airtable connection not found");
    }

    const accessToken = connection.access_token_encrypted;

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
          console.error(`Airtable API error for view ${view.view_name}:`, response.status);
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
