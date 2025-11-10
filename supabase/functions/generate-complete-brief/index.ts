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

  const logs: LogEvent[] = [];
  const addLog = (type: LogEvent["type"], icon: string, message: string, details?: string) => {
    logs.push({ timestamp: Date.now(), type, icon, message, details });
    console.log(`${icon} ${message}`, details || "");
  };

  try {
    const startTime = Date.now();
    addLog("info", "📡", "Connexion établie...");

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

    addLog("success", "👤", `Utilisateur authentifié`, user.email || "");

    // Étape 1: Récupérer le contexte utilisateur
    addLog("info", "🔍", "Récupération des préférences utilisateur...");
    
    const { data: preferences, error: prefError } = await supabase
      .from("preferences")
      .select("*, avatars(*)")
      .eq("user_id", user.id)
      .single();

    if (prefError || !preferences) {
      throw new Error("User preferences not found");
    }

    const avatar = preferences.avatars;
    addLog("success", "🎭", `Avatar: ${avatar.name} (${avatar.role})`);

    // Récupérer la voix
    const voiceId = preferences.voice_id || avatar.default_tone;
    const { data: voice } = await supabase
      .from("elevenlabs_voices")
      .select("name")
      .eq("voice_id", voiceId)
      .single();

    addLog("success", "🎙️", `Voix: ${voice?.name || "Default"}`);

    // Étape 2: Récupérer les données Airtable
    addLog("info", "📊", "Récupération des données Airtable...");

    const airtableResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-airtable-data`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!airtableResponse.ok) {
      throw new Error("Failed to fetch Airtable data");
    }

    const airtableData = await airtableResponse.json();
    const totalRecords = airtableData.total_records;

    if (totalRecords === 0) {
      throw new Error("No data found in Airtable views");
    }

    airtableData.views.forEach((view: any) => {
      addLog("info", "  └─", `${view.base_name} / ${view.view_name}`, `${view.record_count} records`);
    });
    addLog("success", "✅", `${totalRecords} records récupérés depuis ${airtableData.views.length} vues`);

    // Étape 3: Analyse du volume
    addLog("info", "⚖️", "Analyse du volume de données...");
    
    // Estimation simplifiée: 1 record ≈ 200 tokens
    const estimatedTokens = totalRecords * 200;
    const maxTokens = 10000;
    
    let filteredRecords = totalRecords;
    let filteredData = airtableData;

    if (estimatedTokens > maxTokens) {
      // Filtrage simple: prendre les N premiers records de chaque vue
      const ratio = maxTokens / estimatedTokens;
      filteredData = {
        ...airtableData,
        views: airtableData.views.map((view: any) => ({
          ...view,
          records: view.records.slice(0, Math.floor(view.records.length * ratio)),
        })),
      };
      filteredRecords = filteredData.views.reduce((sum: number, view: any) => sum + view.records.length, 0);
      addLog("warning", "⚠️", `Volume réduit: ${filteredRecords} records`, `(${Math.floor(filteredRecords * 200)} tokens estimés)`);
    } else {
      addLog("success", "✅", "Aucun filtrage nécessaire", `${estimatedTokens} tokens estimés`);
    }

    // Étape 4: Construction du prompt enrichi
    addLog("info", "✍️", "Construction du prompt contextualisé...");

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

**Format attendu (réponse JSON stricte) :**
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
    addLog("info", "🤖", "Génération du brief avec DeepSeek...");

    const deepseekResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-brief-text`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: avatar.role,
        data: userPrompt,
        customPrompt: systemPrompt,
      }),
    });

    if (!deepseekResponse.ok) {
      throw new Error("Failed to generate brief text");
    }

    const deepseekResult = await deepseekResponse.json();
    const briefText = deepseekResult.text;
    
    addLog("info", "  └─", `Modèle: deepseek-reasoner`);
    if (deepseekResult.usage) {
      addLog("info", "  └─", `Tokens: ${deepseekResult.usage.prompt_tokens} (input) + ${deepseekResult.usage.completion_tokens} (output)`);
    }
    addLog("success", "✅", `Brief généré`, `${briefText.length} caractères`);

    // Parser le JSON du brief
    let parsedBrief;
    try {
      parsedBrief = JSON.parse(briefText);
    } catch {
      // Si le texte n'est pas du JSON, créer une structure par défaut
      parsedBrief = {
        introduction: briefText.substring(0, 100),
        kpi_analysis: briefText,
        insights: "",
        actions: [],
        conclusion: "",
      };
    }

    // Étape 6: Génération de l'audio avec ElevenLabs
    addLog("info", "🎙️", "Génération audio avec ElevenLabs...");

    const fullText = `${parsedBrief.introduction || ""}\n\n${parsedBrief.kpi_analysis || ""}\n\n${parsedBrief.insights || ""}\n\n${parsedBrief.conclusion || ""}`;

    const elevenLabsResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-voice-sample`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text: fullText,
      }),
    });

    if (!elevenLabsResponse.ok) {
      throw new Error("Failed to generate voice sample");
    }

    // Convertir l'audio en base64 par chunks pour éviter stack overflow
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    
    // Convertir par chunks de 32KB pour éviter "Maximum call stack size exceeded"
    const chunkSize = 32 * 1024;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const audioBase64 = btoa(binary);
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    addLog("info", "  └─", `Voix: ${voice?.name || voiceId}`);
    addLog("info", "  └─", `Modèle: eleven_multilingual_v2`);
    addLog("success", "✅", "Audio généré");

    // Étape 7: Sauvegarde dans la table briefs
    addLog("info", "💾", "Sauvegarde du brief...");

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
      throw briefError;
    }

    addLog("success", "✅", `Brief sauvegardé`, `ID: ${briefData.id}`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    addLog("success", "🎉", `Workflow terminé en ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        brief_id: briefData.id,
        brief_text: parsedBrief,
        audio_url: audioUrl,
        logs: logs,
        metadata: {
          total_records: totalRecords,
          filtered_records: filteredRecords,
          estimated_tokens: filteredRecords * 200,
          generation_time_ms: endTime - startTime,
          deepseek_usage: deepseekResult.usage,
          avatar: avatar.name,
          voice: voice?.name || voiceId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-complete-brief:", error);
    addLog("error", "❌", "Erreur", error instanceof Error ? error.message : "Unknown error");
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: logs,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
