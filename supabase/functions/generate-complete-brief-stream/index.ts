import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogEvent {
  timestamp: number;
  type: "info" | "success" | "error" | "warning";
  icon: string;
  message: string;
  details?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (log: LogEvent) => {
        const data = `event: log\ndata: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendResult = (result: any) => {
        const data = `event: result\ndata: ${JSON.stringify(result)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendDone = () => {
        const data = `event: done\ndata: {}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      };

      const sendError = (error: string) => {
        const data = `event: error\ndata: ${JSON.stringify({ error })}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      };

      try {
        const startTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "📡", message: "Connexion établie..." });

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          sendError("Missing authorization header");
          return;
        }

        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          sendError("Unauthorized");
          return;
        }

        sendLog({ timestamp: Date.now(), type: "success", icon: "👤", message: "Utilisateur authentifié", details: user.email || "" });

        // Étape 1: Récupérer le contexte utilisateur
        sendLog({ timestamp: Date.now(), type: "info", icon: "🔍", message: "Récupération des préférences utilisateur..." });
        
        const { data: preferences, error: prefError } = await supabase
          .from("preferences")
          .select("*, avatars(*)")
          .eq("user_id", user.id)
          .single();

        if (prefError || !preferences) {
          sendError("User preferences not found");
          return;
        }

        const avatar = preferences.avatars;
        sendLog({ timestamp: Date.now(), type: "success", icon: "🎭", message: `Avatar: ${avatar.name} (${avatar.role})` });

        // Récupérer la voix
        const voiceId = preferences.voice_id || avatar.default_tone;
        const { data: voice } = await supabase
          .from("elevenlabs_voices")
          .select("name, description")
          .eq("voice_id", voiceId)
          .single();

        sendLog({ timestamp: Date.now(), type: "success", icon: "🎙️", message: `Voix: ${voice?.name || "Default"}`, details: voice?.description });

        // Étape 2: Récupérer les données Airtable
        sendLog({ timestamp: Date.now(), type: "info", icon: "📊", message: "Récupération des données Airtable..." });

        const airtableResponse = await supabase.functions.invoke("fetch-airtable-data", {
          body: {},
        });

        if (airtableResponse.error) {
          sendError("Failed to fetch Airtable data");
          return;
        }

        const airtableData = airtableResponse.data;
        const totalRecords = airtableData.total_records;

        if (totalRecords === 0) {
          sendError("No data found in Airtable views");
          return;
        }

        airtableData.views.forEach((view: any) => {
          sendLog({ 
            timestamp: Date.now(), 
            type: "info", 
            icon: "  └─", 
            message: `${view.base_name} / ${view.view_name}`, 
            details: `${view.record_count} records` 
          });
        });
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: `${totalRecords} records récupérés depuis ${airtableData.views.length} vues` });

        // Étape 3: Analyse du volume
        sendLog({ timestamp: Date.now(), type: "info", icon: "⚖️", message: "Analyse du volume de données..." });
        
        const estimatedTokens = totalRecords * 200;
        const maxTokens = 10000;
        
        let filteredRecords = totalRecords;
        let filteredData = airtableData;

        if (estimatedTokens > maxTokens) {
          const ratio = maxTokens / estimatedTokens;
          filteredData = {
            ...airtableData,
            views: airtableData.views.map((view: any) => ({
              ...view,
              records: view.records.slice(0, Math.floor(view.records.length * ratio)),
            })),
          };
          filteredRecords = filteredData.views.reduce((sum: number, view: any) => sum + view.records.length, 0);
          sendLog({ 
            timestamp: Date.now(), 
            type: "warning", 
            icon: "⚠️", 
            message: `Volume réduit: ${filteredRecords} records`, 
            details: `(${Math.floor(filteredRecords * 200)} tokens estimés)` 
          });
        } else {
          sendLog({ 
            timestamp: Date.now(), 
            type: "success", 
            icon: "✅", 
            message: "Aucun filtrage nécessaire", 
            details: `${estimatedTokens} tokens estimés` 
          });
        }

        // Étape 4: Construction du prompt enrichi
        sendLog({ timestamp: Date.now(), type: "info", icon: "✍️", message: "Construction du prompt contextualisé..." });

        const weekStart = new Date().toISOString().split('T')[0];

        const systemPrompt = `Tu es ${avatar.name}, ${avatar.role}.

${avatar.pitch}

${avatar.long_pitch}

Crée un brief audio de ${preferences.brief_duration || '2 minutes'} qui sera lu à voix haute.

RÈGLES:
- Réponds UNIQUEMENT avec le texte du brief
- Ton ${preferences.tone || 'professionnel'}
- Style oral et conversationnel
- Langue: ${preferences.lang}
- 200-300 mots maximum
${preferences.focus_topics?.length ? `\n- Focus sur: ${preferences.focus_topics.join(', ')}` : ''}
${preferences.custom_instructions ? `\n- ${preferences.custom_instructions}` : ''}`;

        const userPrompt = `Voici les données de la semaine ${weekStart} :\n\n${JSON.stringify(filteredData, null, 2)}`;

        // Étape 5: Génération du texte avec DeepSeek
        sendLog({ timestamp: Date.now(), type: "info", icon: "🤖", message: "Génération du brief avec DeepSeek..." });

        const deepseekResponse = await supabase.functions.invoke("generate-brief-text", {
          body: {
            domain: avatar.role,
            data: userPrompt,
            customPrompt: systemPrompt,
          },
        });

        if (deepseekResponse.error) {
          sendError("Failed to generate brief text");
          return;
        }

        const deepseekResult = deepseekResponse.data;
        const narrativeText = deepseekResult.text;
        const wordCount = narrativeText.split(/\s+/).length;
        
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: `Modèle: ${deepseekResult.model}` });
        if (deepseekResult.usage) {
          sendLog({ 
            timestamp: Date.now(), 
            type: "info", 
            icon: "  └─", 
            message: `Tokens: ${deepseekResult.usage.prompt_tokens} (input) + ${deepseekResult.usage.completion_tokens} (output)` 
          });
        }
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Brief généré", details: `${narrativeText.length} caractères, ${wordCount} mots` });

        // Étape 6: Génération de l'audio avec ElevenLabs
        sendLog({ timestamp: Date.now(), type: "info", icon: "🎤", message: "Génération audio..." });

        const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
        if (!elevenLabsApiKey) {
          sendError("ELEVENLABS_API_KEY not configured");
          return;
        }

        console.log("=== TEXTE ENVOYÉ À ELEVENLABS ===");
        console.log(narrativeText);
        console.log("=== FIN TEXTE ===");
        console.log("Voice ID:", voiceId);

        const elevenLabsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text: narrativeText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.65,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true
              }
            })
          }
        );

        if (!elevenLabsResponse.ok) {
          const errorText = await elevenLabsResponse.text();
          console.error("ElevenLabs API error:", elevenLabsResponse.status, errorText);
          await sendLog({ 
            timestamp: Date.now(), 
            type: "error", 
            icon: "❌", 
            message: `ElevenLabs erreur ${elevenLabsResponse.status}`,
            details: errorText.substring(0, 200)
          });
          sendError(`Failed to generate voice sample: ${elevenLabsResponse.status} - ${errorText}`);
          return;
        }

        // Convertir l'audio en base64
        const audioBuffer = await elevenLabsResponse.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        
        const chunkSize = 32 * 1024;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const audioBase64 = btoa(binary);
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: `Voix: ${voice?.name || voiceId}` });
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: "Modèle: eleven_multilingual_v2" });
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Audio généré" });

        // Étape 7: Sauvegarde dans la table briefs
        sendLog({ timestamp: Date.now(), type: "info", icon: "💾", message: "Sauvegarde du brief..." });

        const { data: briefData, error: briefError } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            week_start: weekStart,
            script_text: narrativeText,
            audio_url: audioUrl,
            actions_json: [],
            facts_json: {
              total_records: totalRecords,
              filtered_records: filteredRecords,
              views_count: airtableData.views.length,
              estimated_tokens: filteredRecords * 200,
            },
            email_status: "pending",
          })
          .select()
          .single();

        if (briefError) {
          sendError(briefError.message);
          return;
        }

        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Brief sauvegardé", details: `ID: ${briefData.id}` });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        sendLog({ timestamp: Date.now(), type: "success", icon: "🎉", message: `Workflow terminé en ${duration}s` });

        // Envoyer le résultat final
        sendResult({
          success: true,
          brief_id: briefData.id,
          brief_text: narrativeText,
          audio_url: audioUrl,
          metadata: {
            total_records: totalRecords,
            filtered_records: filteredRecords,
            estimated_tokens: filteredRecords * 200,
            generation_time_ms: endTime - startTime,
            deepseek_usage: deepseekResult.usage,
            avatar: avatar.name,
            voice: voice?.name || voiceId,
          },
        });

        sendDone();

      } catch (error) {
        console.error("Error in generate-complete-brief-stream:", error);
        sendLog({ 
          timestamp: Date.now(), 
          type: "error", 
          icon: "❌", 
          message: "Erreur", 
          details: error instanceof Error ? error.message : "Unknown error" 
        });
        sendError(error instanceof Error ? error.message : "Unknown error");
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
