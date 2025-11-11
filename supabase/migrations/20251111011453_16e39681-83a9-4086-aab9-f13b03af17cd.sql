-- Add unique constraint on user_id for onboarding table
ALTER TABLE public.onboarding
DROP CONSTRAINT IF EXISTS onboarding_user_id_key;

ALTER TABLE public.onboarding
ADD CONSTRAINT onboarding_user_id_key UNIQUE (user_id);