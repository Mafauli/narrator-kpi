-- Create enum for business model
CREATE TYPE business_model AS ENUM ('saas', 'ecommerce', 'services', 'other');

-- Create enum for tone
CREATE TYPE tone_type AS ENUM ('sobre', 'coach', 'energique', 'no-bs');

-- Create enum for email status
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');

-- Create connections_airtable table
CREATE TABLE public.connections_airtable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'airtable',
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scopes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create airtable_views table
CREATE TABLE public.airtable_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_id TEXT NOT NULL,
  base_name TEXT NOT NULL,
  table_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  view_id TEXT NOT NULL,
  view_name TEXT NOT NULL,
  schema_json JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, view_id)
);

-- Create preferences table
CREATE TABLE public.preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_model business_model NOT NULL DEFAULT 'saas',
  currency TEXT NOT NULL DEFAULT 'EUR',
  lang TEXT NOT NULL DEFAULT 'FR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  send_dow INTEGER NOT NULL DEFAULT 1 CHECK (send_dow >= 1 AND send_dow <= 7),
  send_hour INTEGER NOT NULL DEFAULT 8 CHECK (send_hour >= 0 AND send_hour <= 23),
  north_star TEXT,
  goal_value NUMERIC,
  thresholds_json JSONB,
  tone tone_type NOT NULL DEFAULT 'no-bs',
  kpi_pack_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create briefs table
CREATE TABLE public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  facts_json JSONB,
  actions_json JSONB,
  script_text TEXT,
  audio_url TEXT,
  email_status email_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS on all tables
ALTER TABLE public.connections_airtable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airtable_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections_airtable
CREATE POLICY "Users can view their own connections"
  ON public.connections_airtable FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
  ON public.connections_airtable FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.connections_airtable FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections_airtable FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for airtable_views
CREATE POLICY "Users can view their own views"
  ON public.airtable_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own views"
  ON public.airtable_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own views"
  ON public.airtable_views FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own views"
  ON public.airtable_views FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for preferences
CREATE POLICY "Users can view their own preferences"
  ON public.preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.preferences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for briefs
CREATE POLICY "Users can view their own briefs"
  ON public.briefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own briefs"
  ON public.briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own briefs"
  ON public.briefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own briefs"
  ON public.briefs FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_connections_airtable_updated_at
  BEFORE UPDATE ON public.connections_airtable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_airtable_views_updated_at
  BEFORE UPDATE ON public.airtable_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();