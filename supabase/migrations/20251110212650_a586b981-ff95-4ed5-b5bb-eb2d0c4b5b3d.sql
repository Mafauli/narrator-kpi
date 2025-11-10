-- Create whatsapp_deliveries table to track all WhatsApp message deliveries
CREATE TABLE public.whatsapp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  message_id TEXT, -- WhatsApp message ID returned by the API
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_whatsapp_deliveries_user_id ON public.whatsapp_deliveries(user_id);
CREATE INDEX idx_whatsapp_deliveries_status ON public.whatsapp_deliveries(status);
CREATE INDEX idx_whatsapp_deliveries_brief_id ON public.whatsapp_deliveries(brief_id);
CREATE INDEX idx_whatsapp_deliveries_created_at ON public.whatsapp_deliveries(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_deliveries
CREATE POLICY "Users can view their own deliveries"
ON public.whatsapp_deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deliveries"
ON public.whatsapp_deliveries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deliveries"
ON public.whatsapp_deliveries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deliveries"
ON public.whatsapp_deliveries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_whatsapp_deliveries_updated_at
BEFORE UPDATE ON public.whatsapp_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create scheduled_briefs table for managing automated brief generation
CREATE TABLE public.scheduled_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'weekly', -- weekly, biweekly, monthly, custom
  day_of_week INTEGER, -- 0-6 (0=Sunday, 1=Monday, etc.)
  day_of_month INTEGER, -- 1-31 for monthly schedules
  hour INTEGER NOT NULL DEFAULT 8, -- 0-23
  minute INTEGER NOT NULL DEFAULT 0, -- 0-59
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, email, both
  phone_number TEXT, -- Required if delivery_method includes whatsapp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  CONSTRAINT valid_hour CHECK (hour >= 0 AND hour <= 23),
  CONSTRAINT valid_minute CHECK (minute >= 0 AND minute <= 59)
);

-- Add indexes for performance
CREATE INDEX idx_scheduled_briefs_user_id ON public.scheduled_briefs(user_id);
CREATE INDEX idx_scheduled_briefs_is_active ON public.scheduled_briefs(is_active);
CREATE INDEX idx_scheduled_briefs_next_send_at ON public.scheduled_briefs(next_send_at);
CREATE INDEX idx_scheduled_briefs_schedule_type ON public.scheduled_briefs(schedule_type);

-- Enable RLS
ALTER TABLE public.scheduled_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_briefs
CREATE POLICY "Users can view their own schedules"
ON public.scheduled_briefs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
ON public.scheduled_briefs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
ON public.scheduled_briefs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
ON public.scheduled_briefs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_scheduled_briefs_updated_at
BEFORE UPDATE ON public.scheduled_briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add phone_number to preferences table if not exists
ALTER TABLE public.preferences 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Create function to calculate next_send_at for scheduled briefs
CREATE OR REPLACE FUNCTION public.calculate_next_send_at(
  schedule_type TEXT,
  day_of_week INTEGER,
  day_of_month INTEGER,
  hour INTEGER,
  minute INTEGER,
  timezone TEXT,
  from_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  next_send TIMESTAMP WITH TIME ZONE;
  target_time TIME;
BEGIN
  target_time := make_time(hour, minute, 0);
  
  CASE schedule_type
    WHEN 'weekly' THEN
      -- Calculate next occurrence of day_of_week
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((day_of_week - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      -- If the calculated time is in the past, add 1 week
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '7 days';
      END IF;
      
    WHEN 'biweekly' THEN
      -- Similar to weekly but add 2 weeks if in the past
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((day_of_week - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '14 days';
      END IF;
      
    WHEN 'monthly' THEN
      -- Calculate next occurrence of day_of_month
      next_send := date_trunc('month', from_timestamp) + (day_of_month - 1) * INTERVAL '1 day' + target_time;
      
      -- If in the past, move to next month
      IF next_send <= from_timestamp THEN
        next_send := date_trunc('month', from_timestamp + INTERVAL '1 month') + (day_of_month - 1) * INTERVAL '1 day' + target_time;
      END IF;
      
    ELSE
      -- Default to weekly on Monday
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((1 - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '7 days';
      END IF;
  END CASE;
  
  RETURN next_send AT TIME ZONE timezone;
END;
$$;

-- Trigger to automatically set next_send_at on insert/update
CREATE OR REPLACE FUNCTION public.update_scheduled_brief_next_send()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.next_send_at := public.calculate_next_send_at(
    NEW.schedule_type,
    NEW.day_of_week,
    NEW.day_of_month,
    NEW.hour,
    NEW.minute,
    NEW.timezone,
    COALESCE(NEW.last_sent_at, NOW())
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_scheduled_brief_next_send
BEFORE INSERT OR UPDATE OF schedule_type, day_of_week, day_of_month, hour, minute, timezone, last_sent_at
ON public.scheduled_briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduled_brief_next_send();