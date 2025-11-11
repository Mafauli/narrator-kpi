-- ============================================
-- CRON SETUP FOR AUTOMATED BRIEF SENDING
-- ============================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the process-scheduled-briefs function to run every 15 minutes
-- This will check for and process any scheduled briefs that are due
SELECT cron.schedule(
  'process-scheduled-briefs-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://whwqreslsneuaavbvlnt.supabase.co/functions/v1/process-scheduled-briefs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indod3FyZXNsc25ldWFhdmJ2bG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjA3MTksImV4cCI6MjA3ODAzNjcxOX0.kUW8XQYjoz4nvKDu7PXoBV1UtSJ7QDZBOosPMWAZQrY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- SECURITY: RESTRICT AVATARS TABLE ACCESS
-- ============================================

-- Drop the public policy
DROP POLICY IF EXISTS "Anyone can view avatars" ON avatars;

-- Create new policy: Only authenticated users can view avatars
CREATE POLICY "Authenticated users can view avatars" 
ON avatars 
FOR SELECT 
TO authenticated 
USING (true);