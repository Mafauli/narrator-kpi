import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

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

    console.log(`Sending brief ${brief_id} to ${phone_number} for user ${user.id}`);

    // Fetch the brief
    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("*")
      .eq("id", brief_id)
      .eq("user_id", user.id)
      .single();

    if (briefError || !brief) {
      console.error("Brief not found:", briefError);
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

    console.log("Sending WhatsApp message...");
    console.log("Audio URL:", brief.audio_url);

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
    console.log("WhatsApp API response:", whatsappData);

    if (!whatsappResponse.ok) {
      console.error("WhatsApp API error:", whatsappData);
      
      // Create failed delivery record
      await supabase.from("whatsapp_deliveries").insert({
        brief_id,
        user_id: user.id,
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
        user_id: user.id,
        phone_number,
        message_id: messageId,
        status: "sent",
        sent_at: new Date().toISOString(),
        retry_count: 0,
      })
      .select()
      .single();

    if (deliveryError) {
      console.error("Failed to create delivery record:", deliveryError);
      // Don't fail the request, message was sent successfully
    }

    console.log("Brief sent successfully:", messageId);

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
    console.error("Error in send-whatsapp-brief:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
