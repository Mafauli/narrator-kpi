-- Add unique constraint on user_id to allow upsert operations
ALTER TABLE public.scheduled_briefs 
ADD CONSTRAINT scheduled_briefs_user_id_key UNIQUE (user_id);