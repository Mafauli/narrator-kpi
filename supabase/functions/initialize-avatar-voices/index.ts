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
    
    // Log some voices to understand the structure
    console.log("Sample voices:", data.voices.slice(0, 3).map((v: any) => ({
      name: v.name,
      labels: v.labels,
      description: v.description?.substring(0, 50)
    })));
    
    // Filter for French voices (1 for the free tier)
    const frenchVoices = data.voices.filter((v: any) => {
      const lang = v.labels?.language?.toLowerCase() || "";
      const desc = (v.description?.toLowerCase() || "") + " " + (v.name?.toLowerCase() || "");
      
      return lang === "fr" || 
             lang === "french" || 
             desc.includes("french") ||
             desc.includes("français");
    });

    console.log(`Found ${frenchVoices.length} French voices`);

    // For testing: Take the first French voice and the first 7 available voices
    // This ensures we have 8 voices mapped to 8 avatars
    const selectedVoices = [
      ...frenchVoices.slice(0, 1), // 1 French voice
      ...data.voices.slice(0, 7)    // First 7 voices (may overlap, but that's ok for testing)
    ];

    // Remove duplicates
    const uniqueVoices = Array.from(new Map(selectedVoices.map(v => [v.voice_id, v])).values());

    console.log(`Selected ${uniqueVoices.length} unique voices for 8 avatars`);
    console.log(`Voice names: ${uniqueVoices.map((v: any) => v.name).join(", ")}`);

    // Initialize Supabase with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, sync voices to elevenlabs_voices table
    const voicesToUpsert = uniqueVoices.map((voice: any) => ({
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
    uniqueVoices.forEach((v: any) => {
      const normalizedName = v.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      voiceMap[normalizedName] = v;
    });

    // Map avatars to voices - distribute voices evenly
    const mappings: Array<{
      avatar_id: string;
      voice_name: string;
      elevenlabs_voice_id: string;
      is_default: boolean;
    }> = [];
    let matchCount = 0;

    avatars.forEach((avatar, index) => {
      // Assign voices in round-robin fashion to ensure all avatars get a voice
      const voiceIndex = index % uniqueVoices.length;
      const matchedVoice = uniqueVoices[voiceIndex];
      
      if (matchedVoice) {
        console.log(`✓ Mapped ${avatar.name} → ${matchedVoice.name} (${matchedVoice.voice_id})`);
        mappings.push({
          avatar_id: avatar.id,
          voice_name: avatar.voice_reco,
          elevenlabs_voice_id: matchedVoice.voice_id,
          is_default: true
        });
        matchCount++;
      }
    });

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
        voices_synced: uniqueVoices.length,
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
