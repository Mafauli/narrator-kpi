-- Add first_name and whatsapp_phone to preferences table
ALTER TABLE public.preferences 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;