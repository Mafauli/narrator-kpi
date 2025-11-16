-- Drop the avatar_voice_mapping table and its dependencies
-- This table is no longer used as voice IDs are now stored directly in avatars.voice_reco

-- Drop the indexes first
DROP INDEX IF EXISTS public.idx_avatar_voice_mapping_avatar;
DROP INDEX IF EXISTS public.idx_avatar_voice_mapping_voice_name;

-- Drop the table (policies and foreign keys will be automatically dropped)
DROP TABLE IF EXISTS public.avatar_voice_mapping CASCADE;