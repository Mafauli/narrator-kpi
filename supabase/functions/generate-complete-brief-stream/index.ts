import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("generate-complete-brief-stream");

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

// Helper to log to database
async function logToDatabase(
  supabase: any,
  userId: string | null,
  eventType: string,
  logLevel: string,
  message: string,
  details?: any,
  durationMs?: number
) {
  try {
    await supabase.from("edge_function_logs").insert({
      function_name: "generate-complete-brief-stream",
      user_id: userId,
      event_type: eventType,
      log_level: logLevel,
      message: message,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      duration_ms: durationMs,
    });
  } catch (error) {
    logger.error("Failed to log to database", { error });
  }
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
        
        let userId: string | null = null;
        let supabaseClient: any;
        let isOnboarding = false;

        // Parse request body to extract parameters
        const body = await req.json();
        isOnboarding = body?.is_onboarding || false;

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          sendError("Missing authorization header");
          return;
        }

        // Check if this is a system call (CRON) via service role
        const userIdHeader = req.headers.get("x-user-id");
        const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        
        if (isServiceRole && userIdHeader) {
          // System call from CRON
          userId = userIdHeader;
          logger.info("System call detected", { user_id: userId });
        } else {
          // Regular user call
          const tempSupabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
          );

          const { data: { user }, error: userError } = await tempSupabase.auth.getUser();
          if (userError || !user) {
            sendError("Unauthorized");
            return;
          }
          userId = user.id;
        }

        // Use service role client for all operations
        supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        sendLog({ timestamp: Date.now(), type: "success", icon: "👤", message: "Utilisateur authentifié" });
        
        // Log workflow start
        await logToDatabase(supabaseClient, userId, "start", "info", "Brief generation workflow started", {
          is_system_call: isServiceRole
        });

        // Rate limiting check
        sendLog({ timestamp: Date.now(), type: "info", icon: "⏱️", message: "Vérification des limites..." });
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await supabaseClient
          .from('briefs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', oneHourAgo);

        if (count && count >= 5) {
          await logToDatabase(supabaseClient, userId, "error", "warning", "Rate limit exceeded", { count });
          sendError('Rate limit: Maximum 5 briefs per hour. Please try again later.');
          return;
        }

        // Étape 1: Récupérer le contexte utilisateur
        const prefStartTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "🔍", message: "Récupération des préférences utilisateur..." });
        
        const { data: preferences, error: prefError } = await supabaseClient
          .from("preferences")
          .select("*, avatars(*)")
          .eq("user_id", userId)
          .single();

        if (prefError || !preferences) {
          await logToDatabase(supabaseClient, userId, "error", "error", "User preferences not found", { error: prefError?.message });
          sendError("User preferences not found");
          return;
        }

        const avatar = preferences.avatars;
        sendLog({ timestamp: Date.now(), type: "success", icon: "🎭", message: `Avatar: ${avatar.name} (${avatar.role})` });

        // Récupérer la voix
        const voiceId = preferences.voice_id || avatar.default_tone;
        const { data: voice } = await supabaseClient
          .from("elevenlabs_voices")
          .select("name, description")
          .eq("voice_id", voiceId)
          .single();

        sendLog({ timestamp: Date.now(), type: "success", icon: "🎙️", message: `Voix: ${voice?.name || "Default"}`, details: voice?.description });
        
        await logToDatabase(supabaseClient, userId, "preferences_loaded", "info", "User preferences loaded", {
          avatar: avatar.name,
          voice: voice?.name || voiceId,
          tone: preferences.tone,
          language: preferences.lang
        }, Date.now() - prefStartTime);

        // Étape 2: Récupérer les données Airtable
        const airtableStartTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "📊", message: "Récupération des données Airtable..." });

        const airtableResponse = await supabaseClient.functions.invoke("fetch-airtable-data", {
          body: {},
          headers: { Authorization: authHeader } // Forward user auth
        });

        if (airtableResponse.error) {
          await logToDatabase(supabaseClient, userId, "airtable_fetch", "error", "Failed to fetch Airtable data", {
            error: airtableResponse.error.message
          });
          sendError("Failed to fetch Airtable data");
          return;
        }

        const airtableData = airtableResponse.data;
        const totalRecords = airtableData.total_records;

        if (totalRecords === 0) {
          await logToDatabase(supabaseClient, userId, "airtable_fetch", "warning", "No data found in Airtable views");
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
        
        await logToDatabase(supabaseClient, userId, "airtable_fetch", "info", "Airtable data fetched successfully", {
          total_records: totalRecords,
          views_count: airtableData.views.length,
          views: airtableData.views.map((v: any) => ({
            base: v.base_name,
            view: v.view_name,
            records: v.record_count
          }))
        }, Date.now() - airtableStartTime);

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

        // Build prompt based on context (onboarding vs regular brief)
        const buildOnboardingPrompt = (avatar: any, preferences: any) => {
          return `Tu es ${avatar.name}, ${avatar.role}, un avatar de KPI Narrator.
${avatar.pitch}
${avatar.long_pitch}

OBJECTIF GLOBAL
Tu écris le script d'un message audio WhatsApp pour un fondateur ou e-commerçant très occupé. 
Ce message sera transformé en voix avec ElevenLabs.

RÔLE ET TON
- Tu parles à la première personne ("je") et tu tutoies l'utilisateur.
- Tu gardes la personnalité de ${avatar.name} : ton style, ton énergie, ta manière d'accompagner.
- Ton: ${preferences.tone || 'professionnel, chaleureux et orienté action'}.
- Langue: ${preferences.lang || 'français'}.

CONTRAINTES DE SORTIE
- Renvoie uniquement le texte qui doit être prononcé.
- Pas de listes à puces, pas de markdown, pas de guillemets autour du texte.
- Pas de balises techniques, pas de JSON, pas de commentaires sur le prompt.
- Style parlé, naturel, phrases plutôt courtes, comme un message vocal WhatsApp.
- Durée cible du message: ${preferences.brief_duration || '2 minutes'} 
  (environ 220–260 mots pour 2 minutes, 120–150 mots pour 1 minute).

BRIEF SPÉCIAL : PREMIER MESSAGE D'ONBOARDING
Pour ce premier brief gratuit :
1) Commence par une courte phrase d'accroche qui te présente rapidement 
   (qui tu es, ton rôle pour l'utilisateur) et ce que tu vas lui apporter chaque semaine.
2) Fais une première lecture des chiffres importants de la période 
   (2 à 3 indicateurs maximum), en les expliquant simplement.
3) Donne une impression générale sur l'état du business cette semaine :
   est-ce que c'est plutôt solide, à surveiller, ou est-ce qu'il y a une alerte ?
4) Ajoute 1 à 2 remarques ou questions intelligentes qui montrent que tu as compris 
   son activité et qui l'aident à clarifier ses priorités.
5) Termine en expliquant très clairement ce que vous ferez pendant les prochains briefs
   automatiques (suivi régulier, actions à tester, optimisation continue),
   et invite-le explicitement à choisir le jour et l'heure de ses prochains briefs hebdomadaires.

PRIORITÉS DE CONTENU
- Tu pars des données fournies, sans jamais inventer de chiffres.
- Si les données sont partielles ou peu claires, tu le signales avec tact et tu restes général,
  en proposant des axes de travail plutôt que des conclusions définitives.
- Tu restes concret : l'utilisateur doit finir le message avec une vision claire de :
  1) où il en est globalement
  2) pourquoi c'est utile de programmer ses briefs automatiques
  3) ce qu'il peut attendre de toi chaque semaine.`.trim();
        };

        const buildStandardPrompt = (avatar: any, preferences: any) => {
          return `Tu es ${avatar.name}, ${avatar.role}.

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
        };

        const systemPrompt = isOnboarding 
          ? buildOnboardingPrompt(avatar, preferences)
          : buildStandardPrompt(avatar, preferences);

        const userPrompt = `Voici les données de la semaine ${weekStart} :\n\n${JSON.stringify(filteredData, null, 2)}`;

        // Étape 5: Génération du texte avec Lovable AI
        const aiStartTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "🤖", message: "Génération du brief avec Lovable AI (Gemini Flash)..." });

        // Extract target duration from preferences (default to 2 minutes)
        const durationMatch = preferences.brief_duration?.match(/(\d+)/);
        const targetDurationMinutes = durationMatch ? parseInt(durationMatch[1]) : 2;

        const aiResponse = await supabaseClient.functions.invoke("generate-brief-text", {
          body: {
            domain: avatar.role,
            data: userPrompt,
            customPrompt: systemPrompt,
            targetDurationMinutes,
            userId: userId,
          },
        });

        if (aiResponse.error) {
          await logToDatabase(supabaseClient, userId, "lovable-ai", "error", "Failed to generate brief text", {
            error: aiResponse.error.message
          });
          sendError("Failed to generate brief text");
          return;
        }

        const aiResult = aiResponse.data;
        const narrativeText = aiResult.text;
        const wordCount = narrativeText.split(/\s+/).length;
        
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: `Modèle: ${aiResult.model}` });
        if (aiResult.usage) {
          sendLog({ 
            timestamp: Date.now(), 
            type: "info", 
            icon: "  └─", 
            message: `Tokens: ${aiResult.usage.prompt_tokens} (input) + ${aiResult.usage.completion_tokens} (output)` 
          });
        }
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Brief généré", details: `${narrativeText.length} caractères, ${wordCount} mots` });
        
        await logToDatabase(supabaseClient, userId, "lovable-ai", "info", "Brief text generated successfully", {
          model: aiResult.model,
          text_length: narrativeText.length,
          word_count: wordCount,
          tokens_input: aiResult.usage?.prompt_tokens,
          tokens_output: aiResult.usage?.completion_tokens,
          target_duration_minutes: targetDurationMinutes
        }, Date.now() - aiStartTime);

        // Étape 6: Génération de l'audio avec ElevenLabs
        const elevenLabsStartTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "🎤", message: "Génération audio..." });

        const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
        if (!elevenLabsApiKey) {
          await logToDatabase(supabaseClient, userId, "elevenlabs", "error", "ELEVENLABS_API_KEY not configured");
          sendError("ELEVENLABS_API_KEY not configured");
          return;
        }

        logger.debug("Sending text to ElevenLabs", { 
          text_length: narrativeText.length,
          voice_id: voiceId 
        });

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
          logger.error("ElevenLabs API error", { 
            status: elevenLabsResponse.status,
            error: errorText.substring(0, 200)
          });
          await logToDatabase(supabaseClient, userId, "elevenlabs", "error", "ElevenLabs API error", {
            status: elevenLabsResponse.status,
            error: errorText.substring(0, 200)
          });
          await sendLog({ 
            timestamp: Date.now(), 
            type: "error", 
            icon: "❌", 
            message: `ElevenLabs erreur ${elevenLabsResponse.status}`,
            details: errorText.substring(0, 200)
          });
          sendError("Failed to generate audio");
          return;
        }

        // Upload audio to Supabase Storage
        const audioBuffer = await elevenLabsResponse.arrayBuffer();
        
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: `Voix: ${voice?.name || voiceId}` });
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: "Modèle: eleven_multilingual_v2" });
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Audio généré" });
        
        await logToDatabase(supabaseClient, userId, "elevenlabs", "info", "Audio generated successfully", {
          voice_id: voiceId,
          voice_name: voice?.name,
          model: "eleven_multilingual_v2",
          audio_size_bytes: audioBuffer.byteLength
        }, Date.now() - elevenLabsStartTime);
        const storageStartTime = Date.now();
        sendLog({ timestamp: Date.now(), type: "info", icon: "💾", message: "Upload de l'audio vers le stockage..." });
        
        const weekStartStr = weekStart.replace(/\//g, '-');
        const fileName = `${userId}/brief-${weekStartStr}-${Date.now()}.mp3`;
        
        const { error: uploadError } = await supabaseClient
          .storage
          .from('briefs-audio')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          logger.error("Storage upload error", { error: uploadError.message });
          await logToDatabase(supabaseClient, userId, "storage", "error", "Failed to upload audio", {
            error: uploadError.message
          });
          sendError("Failed to upload audio");
          return;
        }

        // Store file path instead of public URL for security
        // Signed URLs will be generated on-demand when sending
        const audioPath = fileName;

        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Audio uploadé" });
        
        await logToDatabase(supabaseClient, userId, "storage", "info", "Audio uploaded to storage", {
          file_path: fileName,
          file_size_bytes: audioBuffer.byteLength
        }, Date.now() - storageStartTime);

        // Étape 7: Sauvegarde dans la table briefs (UPSERT)
        sendLog({ timestamp: Date.now(), type: "info", icon: "💾", message: "Sauvegarde du brief..." });

        const { data: briefData, error: briefError } = await supabaseClient
          .from("briefs")
          .upsert({
            user_id: userId,
            week_start: weekStart,
            script_text: narrativeText,
            audio_url: audioPath, // Store file path, not public URL
            actions_json: [],
            facts_json: {
              total_records: totalRecords,
              filtered_records: filteredRecords,
              views_count: airtableData.views.length,
              estimated_tokens: filteredRecords * 200,
            },
            email_status: "pending",
          }, {
            onConflict: 'user_id,week_start'
          })
          .select()
          .single();

        if (briefError) {
          await logToDatabase(supabaseClient, userId, "error", "error", "Failed to save brief", {
            error: briefError.message
          });
          sendError(briefError.message);
          return;
        }

        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Brief sauvegardé", details: `ID: ${briefData.id}` });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        sendLog({ timestamp: Date.now(), type: "success", icon: "🎉", message: `Workflow terminé en ${duration}s` });

        // Generate signed URL for immediate playback (24 hours expiry)
        const { data: signedUrlData } = await supabaseClient
          .storage
          .from('briefs-audio')
          .createSignedUrl(audioPath, 86400); // 24 hours = 86400 seconds

        const signedAudioUrl = signedUrlData?.signedUrl || audioPath;
        
        // Log successful completion
        await logToDatabase(supabaseClient, userId, "success", "info", "Brief generation completed successfully", {
          brief_id: briefData.id,
          total_records: totalRecords,
          filtered_records: filteredRecords,
          views_count: airtableData.views.length,
          text_length: narrativeText.length,
          word_count: wordCount,
          audio_size_bytes: audioBuffer.byteLength
        }, endTime - startTime);

        // Envoyer le résultat final
        sendResult({
          success: true,
          brief_id: briefData.id,
          brief_text: narrativeText,
          audio_url: signedAudioUrl, // Send signed URL to client
          metadata: {
            total_records: totalRecords,
            filtered_records: filteredRecords,
            estimated_tokens: filteredRecords * 200,
            generation_time_ms: endTime - startTime,
            ai_usage: aiResult.usage,
            avatar: avatar.name,
            voice: voice?.name || voiceId,
          },
        });

        sendDone();

      } catch (error) {
        logger.error("Error in generate-complete-brief-stream", { 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
        
        sendLog({ 
          timestamp: Date.now(), 
          type: "error", 
          icon: "❌", 
          message: "Erreur", 
          details: error instanceof Error ? error.message : "Unknown error" 
        });
        sendError("Internal error");
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
