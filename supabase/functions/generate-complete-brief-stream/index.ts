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

**Ton rôle :** ${avatar.pitch}

**Ton expertise :** ${avatar.long_pitch}

**Ton ton :** ${preferences.tone} (${avatar.default_tone})

**Langue :** ${preferences.lang}

**Contexte business :**
- Modèle : ${preferences.business_model}
- North Star Metric : ${preferences.north_star || "Non défini"}
- Objectif : ${preferences.goal_value || "Non défini"} ${preferences.currency}

**Ta mission :**
Analyse les données KPI suivantes et rédis un brief audio structuré pour un dirigeant non-technique.

**IMPORTANT : Réponds UNIQUEMENT avec du JSON pur, sans balises markdown, sans commentaires, sans texte avant ou après.**

**Format attendu (JSON strict, pas de \`\`\`json, pas de \`\`\`) :**
{
  "introduction": "Phrase d'accroche (15-20 mots)",
  "kpi_analysis": "Analyse des KPIs principaux (80-100 mots)",
  "insights": "2-3 insights clés (60-80 mots)",
  "actions": [
    {
      "title": "Action 1",
      "why": "Raison (15 mots max)",
      "how": "Comment faire (25 mots max)",
      "priority": "high"
    }
  ],
  "conclusion": "Phrase de conclusion motivante (15-20 mots)"
}

**Contraintes :**
- Durée orale cible : 1min30 à 2min (200-300 mots total)
- Langage simple, pas de jargon
- 3 actions concrètes maximum
- Chiffres clairs et comparatifs si possible`;

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
        const briefText = deepseekResult.text;
        
        sendLog({ timestamp: Date.now(), type: "info", icon: "  └─", message: "Modèle: deepseek-reasoner" });
        if (deepseekResult.usage) {
          sendLog({ 
            timestamp: Date.now(), 
            type: "info", 
            icon: "  └─", 
            message: `Tokens: ${deepseekResult.usage.prompt_tokens} (input) + ${deepseekResult.usage.completion_tokens} (output)` 
          });
        }
        sendLog({ timestamp: Date.now(), type: "success", icon: "✅", message: "Brief généré", details: `${briefText.length} caractères` });

    // Parser le JSON du brief
    let parsedBrief;
    try {
      // Nettoyer une dernière fois avant parsing (sécurité)
      const cleanedBriefText = briefText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      parsedBrief = JSON.parse(cleanedBriefText);
      
      // Valider que tous les champs requis sont présents
      if (!parsedBrief.introduction || !parsedBrief.kpi_analysis) {
        throw new Error("Missing required fields in brief");
      }
      
      sendLog({ 
        timestamp: Date.now(), 
        type: "success", 
        icon: "✅", 
        message: "JSON validé avec succès" 
      });
      
    } catch (parseError) {
      sendLog({ 
        timestamp: Date.now(), 
        type: "error", 
        icon: "⚠️", 
        message: "Échec du parsing JSON", 
        details: parseError instanceof Error ? parseError.message : "Unknown error" 
      });
      
      // Fallback : créer une structure basique
      parsedBrief = {
        introduction: "Voici votre brief hebdomadaire.",
        kpi_analysis: briefText.substring(0, 500),
        insights: "",
        actions: [],
        conclusion: "Merci de votre attention.",
      };
    }

    // Étape 6: Génération de l'audio avec ElevenLabs
    sendLog({ timestamp: Date.now(), type: "info", icon: "🎙️", message: "Construction du texte narratif..." });

    // Construire le texte de manière narrative pure (sans JSON)
    let fullText = "";

    if (parsedBrief.introduction) {
      fullText += parsedBrief.introduction + "\n\n";
    }

    if (parsedBrief.kpi_analysis) {
      fullText += parsedBrief.kpi_analysis + "\n\n";
    }

    if (parsedBrief.insights) {
      fullText += parsedBrief.insights + "\n\n";
    }

    // Ajouter les actions de manière narrative (pas JSON)
    if (parsedBrief.actions && parsedBrief.actions.length > 0) {
      fullText += "Voici mes recommandations : \n\n";
      parsedBrief.actions.forEach((action: any, index: number) => {
        fullText += `${index + 1}. ${action.title}. ${action.why} ${action.how}\n\n`;
      });
    }

    if (parsedBrief.conclusion) {
      fullText += parsedBrief.conclusion;
    }

    // Nettoyer une dernière fois (sécurité)
    fullText = fullText
      .replace(/\{/g, '')
      .replace(/\}/g, '')
      .replace(/"/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .trim();

    sendLog({ 
      timestamp: Date.now(), 
      type: "success", 
      icon: "📝", 
      message: "Texte narratif construit", 
      details: `${fullText.length} caractères, ${fullText.split(' ').length} mots` 
    });

    console.log("=== TEXTE ENVOYÉ À ELEVENLABS ===");
    console.log(fullText);
    console.log("=== FIN TEXTE ===");

    sendLog({ timestamp: Date.now(), type: "info", icon: "🎤", message: "Génération audio..." });

        const elevenLabsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY") || "",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text: fullText,
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
          sendError("Failed to generate voice sample");
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
            script_text: briefText,
            audio_url: audioUrl,
            actions_json: parsedBrief.actions || [],
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
          brief_text: parsedBrief,
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
