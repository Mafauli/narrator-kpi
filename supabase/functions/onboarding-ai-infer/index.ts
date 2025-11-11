import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SYSTEM_PROMPT = `Tu es "KPI Narrator", un analyste prudent. Tu gères 2 phases contrôlées par "phase": "infer" ou "refine".
Règles:
- Réponds UNIQUEMENT par un objet JSON valide (UTF-8), sans markdown, sans code fence.
- N'invente aucune donnée non visible. Si incertain, indique-le.
- Reste concis, clair, en {lang} pour les messages destinés à l'utilisateur.

PHASE "infer" (à partir des vues Airtable)
Inputs attendus:
- lang, tz
- views_schema: [{view_name, table_name, fields:[{name,type}], row_count?}]
- samples: [{view_name, rows:[{...}]}]
Objectif:
1) Deviner le secteur probable (ecommerce/saas/services/other) et pourquoi.
2) Proposer 3–6 KPIs cohérents.
3) Lister les champs manquants utiles (si besoin).
4) Générer:
   - pitch_message (≤ 90 mots, une seule question en fin)
   - sample_brief (90–120s max, structure simple: 1 phrase contexte, 3–4 insights, 3 actions Titre|Pourquoi|Comment)
5) Construire un "context" provisoire minimal, éditable ensuite.

PHASE "refine" (fusionner avec la réponse libre de l'utilisateur)
Inputs attendus:
- lang, tz
- prior_inference: JSON complet renvoyé en phase "infer"
- user_reply_raw: texte libre
Objectif:
1) Mettre à jour un "context" final (éditable) en intégrant la réponse utilisateur (ton, objectifs, KPIs, contraintes).
2) confirmation_message (≤ 80 mots) résumant secteur, North Star s'il existe, 2–4 KPIs; poser une unique question si nécessaire.
3) sample_brief régénéré cohérent avec le nouveau context.

Format de sortie (même schéma pour les deux phases)
{
  "sector_guess": "ecommerce|saas|services|other",
  "why_signals": ["brefs indices détectés"],
  "suggested_kpis": ["..."],
  "missing_fields": ["..."],
  "confidence": "low|medium|high",
  "pitch_message": "string en {lang}",
  "sample_brief": "string en {lang}",
  "context": {
    "sector_final": "ecommerce|saas|services|other|null",
    "north_star_metric": "string|null",
    "kpis_final": ["string", ...],
    "goals": [{"label":"string","target_value":"string|null","horizon":"30j|90j|quarter|year|null"}],
    "constraints": ["string", ...],
    "preferred_tone": "no-bs|sobre|coach|energique|null",
    "language": "{lang}",
    "timezone": "{tz}",
    "data_sources": ["airtable", "shopify", "ga4", "meta_ads", ...]
  },
  "confirmation_message": "string en {lang}"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: { Authorization: authHeader },
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { phase, lang = 'fr', tz = 'Europe/Paris', views_schema, samples, prior_inference, user_reply_raw } = await req.json();

    if (!phase || !['infer', 'refine'].includes(phase)) {
      throw new Error('Invalid phase. Must be "infer" or "refine"');
    }

    console.log(`[onboarding-ai-infer] Phase: ${phase}, User: ${user.id}`);

    let userMessage: any;
    
    if (phase === 'infer') {
      if (!views_schema || !samples) {
        throw new Error('Missing views_schema or samples for infer phase');
      }
      userMessage = {
        phase: 'infer',
        lang,
        tz,
        views_schema,
        samples
      };
    } else {
      if (!prior_inference || !user_reply_raw) {
        throw new Error('Missing prior_inference or user_reply_raw for refine phase');
      }
      userMessage = {
        phase: 'refine',
        lang,
        tz,
        prior_inference,
        user_reply_raw
      };
    }

    // Call DeepSeek
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(userMessage) }
        ],
        response_format: { type: 'json_object' },
        temperature: 1.0
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('[onboarding-ai-infer] DeepSeek error:', errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const responseText = deepseekData.choices[0].message.content;
    
    console.log('[onboarding-ai-infer] DeepSeek response length:', responseText.length);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('[onboarding-ai-infer] Failed to parse JSON:', e);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    // Save to onboarding table
    if (phase === 'infer') {
      const { error: insertError } = await supabase
        .from('onboarding')
        .upsert({
          user_id: user.id,
          infer_json: parsedResponse,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (insertError) {
        console.error('[onboarding-ai-infer] Error saving infer_json:', insertError);
      }
    } else {
      const { error: updateError } = await supabase
        .from('onboarding')
        .update({
          final_context: parsedResponse,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[onboarding-ai-infer] Error saving final_context:', updateError);
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[onboarding-ai-infer] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
