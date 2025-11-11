import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("process-scheduled-briefs");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify CRON secret token for authentication
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  
  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const providedToken = authHeader?.replace("Bearer ", "");
  if (providedToken !== cronSecret) {
    logger.error("Unauthorized CRON access attempt", { providedToken: '[REDACTED]' });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logger.info("Starting scheduled briefs processing");

    // Fetch all active schedules where next_send_at <= NOW()
    const { data: schedules, error: scheduleError } = await supabase
      .from("scheduled_briefs")
      .select("*")
      .eq("is_active", true)
      .lte("next_send_at", new Date().toISOString())
      .order("next_send_at", { ascending: true });

    if (scheduleError) {
      logger.error("Error fetching schedules", { error: scheduleError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch schedules" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!schedules || schedules.length === 0) {
      logger.info("No schedules to process");
      return new Response(
        JSON.stringify({ message: "No schedules to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Schedules found", { count: schedules.length });

    const results = {
      total: schedules.length,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each schedule
    for (const schedule of schedules) {
      try {
        logger.info("Processing schedule", { 
          schedule_id: schedule.id, 
          user_id: schedule.user_id 
        });

        // Step 1: Generate brief using service role (bypasses auth for system tasks)
        logger.info("Generating brief", { schedule_id: schedule.id });
        
        // Create a Supabase client with user context for the brief generation
        const userSupabase = createClient(
          supabaseUrl,
          supabaseServiceKey,
          {
            auth: {
              persistSession: false
            },
            global: {
              headers: {
                'x-user-id': schedule.user_id // Pass user ID in header for context
              }
            }
          }
        );

        // Call generate-complete-brief-stream with service role
        const briefResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-complete-brief-stream`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "x-user-id": schedule.user_id,
            },
          }
        );

        if (!briefResponse.ok) {
          throw new Error(`Brief generation failed: ${briefResponse.status}`);
        }

        // Parse stream to get brief_id
        const reader = briefResponse.body?.getReader();
        const decoder = new TextDecoder();
        let briefId = null;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.brief_id) {
                    briefId = data.brief_id;
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
              }
            }
          }
        }

        if (!briefId) {
          throw new Error("Brief generation succeeded but no brief_id returned");
        }

        logger.info("Brief generated successfully", { brief_id: briefId });

        // Step 2: Send via WhatsApp
        if (schedule.delivery_method === "whatsapp" && schedule.phone_number) {
          logger.info("Sending brief via WhatsApp", { 
            brief_id: briefId, 
            phone: schedule.phone_number 
          });
          
          const whatsappResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-whatsapp-brief`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
                "x-user-id": schedule.user_id,
              },
              body: JSON.stringify({
                brief_id: briefId,
                phone_number: schedule.phone_number,
              }),
            }
          );

          if (!whatsappResponse.ok) {
            const errorData = await whatsappResponse.json();
            throw new Error(`WhatsApp send failed: ${errorData.error}`);
          }

          logger.info("Brief sent via WhatsApp successfully", { brief_id: briefId });
        }

        // Step 3: Update schedule
        logger.info("Updating schedule", { schedule_id: schedule.id });
        const now = new Date();
        
        // Calculate next_send_at using the database function
        const { data: updatedSchedule, error: updateError } = await supabase
          .from("scheduled_briefs")
          .update({
            last_sent_at: now.toISOString(),
          })
          .eq("id", schedule.id)
          .select()
          .single();

        if (updateError) {
          logger.warn("Failed to update schedule", { 
            schedule_id: schedule.id, 
            error: updateError.message 
          });
        } else {
          logger.info("Schedule updated", { 
            schedule_id: schedule.id, 
            next_send_at: updatedSchedule.next_send_at 
          });
        }

        results.success++;
        logger.info("Schedule processed successfully", { schedule_id: schedule.id });

      } catch (error) {
        logger.error("Failed to process schedule", { 
          schedule_id: schedule.id, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
        results.failed++;
        results.errors.push({
          schedule_id: schedule.id,
          user_id: schedule.user_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Log error but continue processing other schedules
        await supabase.from("admin_audit_logs").insert({
          admin_user_id: schedule.user_id,
          action_type: "scheduled_brief_failed",
          target_table: "scheduled_briefs",
          target_id: schedule.id,
          changes: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    logger.info("Processing complete", { 
      success: results.success, 
      failed: results.failed 
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.total,
        succeeded: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("Fatal error in process-scheduled-briefs", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});