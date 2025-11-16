-- Simplifier la table avatars avec les nouveaux champs
-- D'abord supprimer les anciennes colonnes
ALTER TABLE public.avatars 
  DROP COLUMN IF EXISTS long_pitch,
  DROP COLUMN IF EXISTS pitch,
  DROP COLUMN IF EXISTS image_prompt,
  DROP COLUMN IF EXISTS skills,
  DROP COLUMN IF EXISTS best_for,
  DROP COLUMN IF EXISTS example_actions,
  DROP COLUMN IF EXISTS default_tone;

-- Renommer voice_reco en voice_id pour plus de clarté
ALTER TABLE public.avatars 
  RENAME COLUMN voice_reco TO voice_id;

-- Ajouter les nouveaux champs simplifiés
ALTER TABLE public.avatars 
  ADD COLUMN role_simplified text NOT NULL DEFAULT '',
  ADD COLUMN promise text NOT NULL DEFAULT '',
  ADD COLUMN personality text NOT NULL DEFAULT '',
  ADD COLUMN voice_tone text NOT NULL DEFAULT '',
  ADD COLUMN ideal_for text NOT NULL DEFAULT '',
  ADD COLUMN domains text NOT NULL DEFAULT '',
  ADD COLUMN action_types text NOT NULL DEFAULT '',
  ADD COLUMN sample_text text NOT NULL DEFAULT '',
  ADD COLUMN sample_audio_url text;

-- Supprimer l'ancien champ role et renommer role_simplified en role
ALTER TABLE public.avatars 
  DROP COLUMN IF EXISTS role;
  
ALTER TABLE public.avatars 
  RENAME COLUMN role_simplified TO role;