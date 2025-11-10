-- Create table for caching ElevenLabs voices
CREATE TABLE public.elevenlabs_voices (
  id TEXT PRIMARY KEY,
  voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  preview_url TEXT,
  category TEXT,
  labels JSONB,
  description TEXT,
  language TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast language filtering
CREATE INDEX idx_elevenlabs_voices_language ON public.elevenlabs_voices(language);
CREATE INDEX idx_elevenlabs_voices_name ON public.elevenlabs_voices(name);

-- Enable RLS
ALTER TABLE public.elevenlabs_voices ENABLE ROW LEVEL SECURITY;

-- Public read access for authenticated users
CREATE POLICY "Allow authenticated users to read voices" 
  ON public.elevenlabs_voices 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create table for mapping avatars to voices
CREATE TABLE public.avatar_voice_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id TEXT NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  voice_name TEXT NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast avatar lookups
CREATE INDEX idx_avatar_voice_mapping_avatar ON public.avatar_voice_mapping(avatar_id);
CREATE INDEX idx_avatar_voice_mapping_voice_name ON public.avatar_voice_mapping(voice_name);

-- Enable RLS
ALTER TABLE public.avatar_voice_mapping ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read avatar voice mappings" 
  ON public.avatar_voice_mapping 
  FOR SELECT 
  USING (true);

-- Trigger to update updated_at on elevenlabs_voices
CREATE TRIGGER update_elevenlabs_voices_updated_at
  BEFORE UPDATE ON public.elevenlabs_voices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();