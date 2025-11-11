import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("send-whatsapp-brief");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendBriefRequest {
  brief_id: string;
  phone_number: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Check if this is a system call (CRON) via service role
    const userIdHeader = req.headers.get("x-user-id");
    const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    
    let userId: string;
    
    if (isServiceRole && userIdHeader) {
      // System call from CRON
      userId = userIdHeader;
      logger.info("System call detected", { user_id: userId });
    } else {
      // Regular user call
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Unauthorized");
      }
      userId = user.id;
    }

    // Use service role client for all operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { brief_id, phone_number }: SendBriefRequest = await req.json();

    // Validate input
    if (!brief_id || !phone_number) {
      return new Response(
        JSON.stringify({ error: "brief_id and phone_number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (international format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid phone number format. Use international format (e.g., +33612345678)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Sending brief", { 
      brief_id, 
      phone_number, 
      user_id: userId 
    });

    // Rate limiting check: max 10 sends per hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentSends } = await supabase
      .from("whatsapp_deliveries")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (recentSends && recentSends.length >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded: maximum 10 sends per hour" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the brief
    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("*")
      .eq("id", brief_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (briefError) {
      logger.error("Database error fetching brief", { error: briefError.message });
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!brief) {
      logger.error("Brief not found", { brief_id, user_id: userId });
      return new Response(
        JSON.stringify({ error: "Brief not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!brief.audio_url) {
      return new Response(
        JSON.stringify({ error: "Brief has no audio URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp credentials
    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error("WhatsApp credentials not configured");
    }

    logger.info("Sending WhatsApp message", { audio_url: brief.audio_url });

    // Send message via WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone_number,
          type: "audio",
          audio: {
            link: brief.audio_url,
          },
        }),
      }
    );

    const whatsappData = await whatsappResponse.json();
    logger.info("WhatsApp API response received", { 
      status: whatsappResponse.status 
    });

    if (!whatsappResponse.ok) {
      logger.error("WhatsApp API error", { 
        status: whatsappResponse.status,
        error: whatsappData.error?.message 
      });
      
      // Create failed delivery record
      await supabase.from("whatsapp_deliveries").insert({
        brief_id,
        user_id: userId,
        phone_number,
        status: "failed",
        error_message: whatsappData.error?.message || "Unknown WhatsApp API error",
        retry_count: 0,
      });

      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message",
          details: whatsappData.error?.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract message ID from WhatsApp response
    const messageId = whatsappData.messages?.[0]?.id;

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from("whatsapp_deliveries")
      .insert({
        brief_id,
        user_id: userId,
        phone_number,
        message_id: messageId,
        status: "sent",
        sent_at: new Date().toISOString(),
        retry_count: 0,
      })
      .select()
      .single();

    if (deliveryError) {
      logger.warn("Failed to create delivery record", { 
        error: deliveryError.message 
      });
      // Don't fail the request, message was sent successfully
    }

    logger.info("Brief sent successfully", { 
      message_id: messageId, 
      brief_id 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        delivery_id: delivery?.id,
        brief_id,
        phone_number,
        sent_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logger.error("Error in send-whatsapp-brief", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    
    return new Response(
      JSON.stringify({ error: "Failed to send brief" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
