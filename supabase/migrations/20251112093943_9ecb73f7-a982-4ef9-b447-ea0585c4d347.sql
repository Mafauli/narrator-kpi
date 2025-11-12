-- Create edge_function_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL, -- 'start', 'success', 'error', 'airtable_fetch', 'deepseek', 'elevenlabs', 'storage'
  log_level TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error'
  message TEXT NOT NULL,
  details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_edge_function_logs_function_name ON public.edge_function_logs(function_name);
CREATE INDEX idx_edge_function_logs_user_id ON public.edge_function_logs(user_id);
CREATE INDEX idx_edge_function_logs_created_at ON public.edge_function_logs(created_at DESC);
CREATE INDEX idx_edge_function_logs_log_level ON public.edge_function_logs(log_level);

-- Enable RLS
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all logs"
  ON public.edge_function_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own logs
CREATE POLICY "Users can view their own logs"
  ON public.edge_function_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert logs (service role)
CREATE POLICY "Service role can insert logs"
  ON public.edge_function_logs
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically delete logs older than 30 days
CREATE OR REPLACE FUNCTION public.delete_old_edge_function_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.edge_function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a cron job to run the cleanup daily at 3 AM
SELECT cron.schedule(
  'delete-old-edge-function-logs',
  '0 3 * * *', -- Every day at 3 AM
  $$SELECT public.delete_old_edge_function_logs()$$
);