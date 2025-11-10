import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    console.log("Fetching French voices from ElevenLabs API...");

    // Fetch voices from ElevenLabs
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { 
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.voices.length} voices from ElevenLabs`);
    
    // Filter for voices that are either French or multilingual
    // Many professional voices are multilingual and work great for French
    const frenchVoices = data.voices.filter((v: any) => {
      const lang = v.labels?.language?.toLowerCase() || "";
      const desc = (v.description?.toLowerCase() || "") + " " + (v.name?.toLowerCase() || "");
      
      // Include if explicitly French or multilingual, or if name/description suggests French capability
      return lang === "fr" || 
             lang === "french" || 
             lang.includes("multilingual") ||
             desc.includes("french") ||
             desc.includes("français") ||
             desc.includes("france");
    });

    console.log(`Found ${frenchVoices.length} French/multilingual voices`);
    console.log(`Voice names: ${frenchVoices.map((v: any) => v.name).join(", ")}`);

    // Initialize Supabase with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, sync voices to elevenlabs_voices table
    const voicesToUpsert = frenchVoices.map((voice: any) => ({
      id: voice.voice_id,
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url || null,
      category: voice.category || null,
      labels: voice.labels || {},
      description: voice.description || null,
      language: voice.labels?.language || "fr",
      gender: voice.labels?.gender || null,
      updated_at: new Date().toISOString()
    }));

    console.log("Upserting voices to database...");
    const { error: upsertError } = await supabaseClient
      .from("elevenlabs_voices")
      .upsert(voicesToUpsert, { onConflict: "voice_id" });

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw upsertError;
    }

    // Fetch all avatars
    const { data: avatars, error: avatarsError } = await supabaseClient
      .from("avatars")
      .select("id, name, voice_reco");

    if (avatarsError) throw avatarsError;
    console.log(`Found ${avatars.length} avatars`);

    // Create a map for fuzzy matching
    const voiceMap: Record<string, any> = {};
    frenchVoices.forEach((v: any) => {
      const normalizedName = v.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      voiceMap[normalizedName] = v;
    });

    // Map avatars to voices with more flexible matching
    const mappings = [];
    let matchCount = 0;

    // Define manual mapping for recommended voice names to likely ElevenLabs equivalents
    const nameMapping: Record<string, string[]> = {
      "thomas": ["thomas", "antoine", "alex", "henri", "pierre"],
      "claire": ["claire", "charlotte", "chloe", "amelie", "marie"],
      "ines": ["ines", "inès", "isabelle", "emma", "lea"],
      "sofia": ["sofia", "sophie", "sarah", "lisa", "julie"],
      "javier": ["javier", "antoine", "luc", "marc", "paul"]
    };

    for (const avatar of avatars) {
      const voiceRecoNormalized = avatar.voice_reco.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Try exact match first
      let matchedVoice = voiceMap[voiceRecoNormalized];
      
      // Try alternative names from mapping
      if (!matchedVoice && nameMapping[voiceRecoNormalized]) {
        for (const altName of nameMapping[voiceRecoNormalized]) {
          matchedVoice = voiceMap[altName];
          if (matchedVoice) break;
          
          // Try partial match with alternative name
          const partialMatch = Object.keys(voiceMap).find(key => 
            key.includes(altName) || altName.includes(key)
          );
          if (partialMatch) {
            matchedVoice = voiceMap[partialMatch];
            break;
          }
        }
      }
      
      // If still no match, try any partial match
      if (!matchedVoice) {
        const partialMatch = Object.keys(voiceMap).find(key => 
          key.includes(voiceRecoNormalized) || voiceRecoNormalized.includes(key)
        );
        if (partialMatch) {
          matchedVoice = voiceMap[partialMatch];
        }
      }

      if (matchedVoice) {
        console.log(`✓ Matched ${avatar.name} (${avatar.voice_reco}) → ${matchedVoice.name} (${matchedVoice.voice_id})`);
        mappings.push({
          avatar_id: avatar.id,
          voice_name: avatar.voice_reco,
          elevenlabs_voice_id: matchedVoice.voice_id,
          is_default: true
        });
        matchCount++;
      } else {
        console.log(`✗ No match found for ${avatar.name} (${avatar.voice_reco})`);
        console.log(`   Available voices: ${Object.keys(voiceMap).slice(0, 5).join(", ")}...`);
      }
    }

    console.log(`Successfully matched ${matchCount}/${avatars.length} avatars`);

    // Insert mappings
    if (mappings.length > 0) {
      // First, delete existing mappings for these avatars to avoid conflicts
      const avatarIds = mappings.map(m => m.avatar_id);
      await supabaseClient
        .from("avatar_voice_mapping")
        .delete()
        .in("avatar_id", avatarIds);

      const { data: insertedMappings, error: mappingError } = await supabaseClient
        .from("avatar_voice_mapping")
        .insert(mappings)
        .select();

      if (mappingError) {
        console.error("Mapping insert error:", mappingError);
        throw mappingError;
      }

      console.log(`Inserted ${insertedMappings.length} voice mappings`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        voices_synced: frenchVoices.length,
        avatars_total: avatars.length,
        avatars_mapped: matchCount,
        mappings: mappings
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error initializing avatar voices:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
