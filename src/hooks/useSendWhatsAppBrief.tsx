import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendWhatsAppBriefParams {
  brief_id: string;
  phone_number: string;
}

interface SendWhatsAppBriefResponse {
  success: boolean;
  message_id: string;
  delivery_id: string;
  brief_id: string;
  phone_number: string;
  sent_at: string;
}

export const useSendWhatsAppBrief = () => {
  const [sending, setSending] = useState(false);

  const sendBrief = async ({ 
    brief_id, 
    phone_number 
  }: SendWhatsAppBriefParams): Promise<SendWhatsAppBriefResponse | null> => {
    try {
      setSending(true);
      console.log("Sending brief via WhatsApp...", { brief_id, phone_number });
      
      const { data: result, error } = await supabase.functions.invoke<SendWhatsAppBriefResponse>(
        "send-whatsapp-brief",
        {
          body: { brief_id, phone_number },
        }
      );
      
      if (error) throw error;
      
      console.log("Brief sent successfully:", result);
      toast.success("Brief envoyé via WhatsApp");
      
      return result;
    } catch (error) {
      console.error("Error sending brief via WhatsApp:", error);
      toast.error("Erreur lors de l'envoi du brief");
      return null;
    } finally {
      setSending(false);
    }
  };

  return { 
    sendBrief,
    sending,
  };
};
