-- Add phone number validation constraints to ensure data integrity

-- Add constraint to scheduled_briefs table
ALTER TABLE scheduled_briefs
ADD CONSTRAINT valid_phone_format 
CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');

-- Add constraint to preferences table
ALTER TABLE preferences
ADD CONSTRAINT valid_whatsapp_phone 
CHECK (whatsapp_phone IS NULL OR whatsapp_phone ~ '^\+[1-9]\d{1,14}$');