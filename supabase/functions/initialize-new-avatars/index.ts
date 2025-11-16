import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const avatarsData = [
  {
    id: "cfo_delta",
    name: "Emma",
    role: "La gardienne de ta trésorerie",
    promise: "Elle t'aide à gagner plus et dépenser moins.",
    personality: "Posée, pédagogue, très factuelle",
    voice_tone: "Calme, rassurante, analytique",
    ideal_for: "E-commerçants, SaaS, services qui veulent comprendre leurs chiffres",
    domains: "Trésorerie, rentabilité, économies, pricing",
    action_types: "Alerter les fuites, recommander un prix, optimiser les coûts",
    voice_id: "McVZB9hVxVSk3Equu8EH",
    sample_text: "Ta boutique a bien tourné cette semaine, mais ta trésorerie se tend. Je t'ai repéré trois fuites à corriger et une action simple pour augmenter ta marge dès aujourd'hui."
  },
  {
    id: "ceo_alpha",
    name: "Léo",
    role: "Le dirigeant qui te garde focus",
    promise: "Il t'aide à choisir les 3 actions qui feront bouger le business.",
    personality: "Direct, clair, pragmatique",
    voice_tone: "No-bullshit, calme mais tranchant",
    ideal_for: "Entrepreneurs débordés",
    domains: "Priorisation, vision, organisation, exécution",
    action_types: "Focus, élimination, plan de 8 semaines",
    voice_id: "BVBq6HVJVdnwOMJOqvy9",
    sample_text: "Stop la dispersion. Voici les trois actions qui vont vraiment faire avancer ta boutique cette semaine. Le reste attendra."
  },
  {
    id: "cmo_nova",
    name: "Inès",
    role: "Ton cerveau marketing",
    promise: "Plus de clients sans brûler ton budget.",
    personality: "Dynamique, optimiste, orientée résultats",
    voice_tone: "Énergique mais professionnelle",
    ideal_for: "E-com, marketing, SaaS",
    domains: "Acquisition, publicité, conversion",
    action_types: "Relances, tests pages, emails panier",
    voice_id: "5OnMHwgTFgvPVwE8jP6B",
    sample_text: "Tu as un beau trafic cette semaine, mais tu laisses trop de ventes sur la table. Voici comment récupérer ces clients et convertir plus sans dépenser plus."
  },
  {
    id: "sales_zenith",
    name: "Javier",
    role: "Ton accélérateur de ventes",
    promise: "Il fait avancer les deals qui traînent.",
    personality: "Enthousiaste, commercial, motivant",
    voice_tone: "Énergique & clair",
    ideal_for: "Services, agences, SaaS",
    domains: "Vente, relances, négociation, suivi",
    action_types: "Appels à 48h, séquences emails, prochaines étapes",
    voice_id: "jUHQdLfy668sllNiNTSW",
    sample_text: "Tes prospects sont chauds, mais tu les laisses refroidir. Voici trois relances simples pour conclure plus vite cette semaine."
  },
  {
    id: "coo_orion",
    name: "Sofia",
    role: "La garante de la livraison sans stress",
    promise: "Elle remet de l'ordre et fluidifie le travail.",
    personality: "Calme, structurée, méthodique",
    voice_tone: "Sobre, posée",
    ideal_for: "Services, e-com, SaaS",
    domains: "Organisation, process, délais, qualité",
    action_types: "Checklists, daily meeting, débloquer un goulot",
    voice_id: "uyCFY7D8n0oaM5Smchqu",
    sample_text: "Tu peux livrer à temps cette semaine. On a un seul goulot à débloquer, et je te donne les trois étapes pour y arriver sans stress."
  },
  {
    id: "ops_legal",
    name: "Ana",
    role: "La protectrice de tes contrats",
    promise: "Elle t'évite les renouvellements forcés et les mauvaises surprises.",
    personality: "Carrée, sérieuse mais simple",
    voice_tone: "Directe, no-BS",
    ideal_for: "Services, agences, e-com",
    domains: "Contrats, fournisseurs, dates clés",
    action_types: "Non-reconduction, renégociations, checklists",
    voice_id: "uyCFY7D8n0oaM5Smchqu",
    sample_text: "Attention : une échéance contractuelle approche. Je te donne les trois actions pour éviter des pénalités et renégocier en ta faveur."
  },
  {
    id: "ecom_lumen",
    name: "Maya",
    role: "La spécialiste croissance e-commerce",
    promise: "Elle augmente le panier moyen et réduit les retours.",
    personality: "Amicale, orientée optimisation",
    voice_tone: "Coach motivante",
    ideal_for: "E-commerce",
    domains: "Panier, promotions, stock, UX",
    action_types: "Offres, rassurance, gestion des retours ou stock",
    voice_id: "d3AXX0BlgJHYFCuH9X88",
    sample_text: "Tes clients adorent tes produits, mais ils n'achètent pas assez. Voici trois optimisations simples pour booster ton panier moyen dès cette semaine."
  },
  {
    id: "cs_aurora",
    name: "Noah",
    role: "Le gardien de la fidélité client",
    promise: "Il garde tes clients heureux et réduit ton churn.",
    personality: "Bienveillant, empathique",
    voice_tone: "Doux, coach positif",
    ideal_for: "SaaS, services",
    domains: "Fidélisation, satisfaction, réactivation",
    action_types: "Contacter utilisateurs inactifs, guides, points clients",
    voice_id: "JdwJ7jL68CWmQZuo7KgG",
    sample_text: "Plusieurs clients s'éloignent. Je te montre qui contacter et comment les réactiver pour renforcer la fidélité cette semaine."
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Initializing avatars...");

    // Insérer ou mettre à jour les avatars
    const { error: upsertError } = await supabase
      .from("avatars")
      .upsert(avatarsData, { onConflict: "id" });

    if (upsertError) {
      throw upsertError;
    }

    console.log("Avatars initialized, now generating audio samples...");

    // Générer les samples audio pour chaque avatar
    const samplePromises = avatarsData.map(async (avatar) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-avatar-sample`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            voiceId: avatar.voice_id,
            text: avatar.sample_text,
            avatarId: avatar.id,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`Error generating sample for ${avatar.name}:`, error);
          return { success: false, avatar: avatar.name, error };
        }

        const result = await response.json();
        console.log(`Sample generated for ${avatar.name}:`, result.audioUrl);
        return { success: true, avatar: avatar.name, audioUrl: result.audioUrl };
      } catch (error) {
        console.error(`Error generating sample for ${avatar.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, avatar: avatar.name, error: errorMessage };
      }
    });

    const results = await Promise.all(samplePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${avatarsData.length} avatars initialized, ${successCount} samples generated, ${failCount} failed`,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error initializing avatars:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
