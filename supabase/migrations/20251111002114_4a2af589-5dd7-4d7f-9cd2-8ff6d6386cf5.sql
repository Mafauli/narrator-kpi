-- ============================================
-- SESSION 1: SÉCURITÉ + TABLES ADMIN
-- ============================================

-- 1. FIX SECURITY WARNINGS: Add search_path to existing functions
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_next_send_at(
  schedule_type text, 
  day_of_week integer, 
  day_of_month integer, 
  hour integer, 
  minute integer, 
  timezone text, 
  from_timestamp timestamp with time zone DEFAULT now()
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_send TIMESTAMP WITH TIME ZONE;
  target_time TIME;
BEGIN
  target_time := make_time(hour, minute, 0);
  
  CASE schedule_type
    WHEN 'weekly' THEN
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((day_of_week - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '7 days';
      END IF;
      
    WHEN 'biweekly' THEN
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((day_of_week - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '14 days';
      END IF;
      
    WHEN 'monthly' THEN
      next_send := date_trunc('month', from_timestamp) + (day_of_month - 1) * INTERVAL '1 day' + target_time;
      
      IF next_send <= from_timestamp THEN
        next_send := date_trunc('month', from_timestamp + INTERVAL '1 month') + (day_of_month - 1) * INTERVAL '1 day' + target_time;
      END IF;
      
    ELSE
      next_send := date_trunc('day', from_timestamp) + target_time;
      next_send := next_send + ((1 - EXTRACT(DOW FROM next_send)::INTEGER + 7) % 7) * INTERVAL '1 day';
      
      IF next_send <= from_timestamp THEN
        next_send := next_send + INTERVAL '7 days';
      END IF;
  END CASE;
  
  RETURN next_send AT TIME ZONE timezone;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_scheduled_brief_next_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2. CREATE USER ROLES SYSTEM
-- ============================================

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (PREVENTS RECURSIVE RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 3. CREATE BRIEF GENERATION LOGS TABLE (for cost tracking & prompt analysis)
-- ============================================

CREATE TABLE public.brief_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES public.briefs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_version_id UUID,
  prompt_text_used TEXT NOT NULL,
  deepseek_response_full TEXT NOT NULL,
  deepseek_tokens_input INTEGER NOT NULL,
  deepseek_tokens_output INTEGER NOT NULL,
  deepseek_cost NUMERIC(10, 6) NOT NULL,
  generation_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brief_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own generation logs"
ON public.brief_generation_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generation logs"
ON public.brief_generation_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert generation logs"
ON public.brief_generation_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. CREATE SYSTEM PROMPTS TABLE
-- ============================================

CREATE TABLE public.system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  prompt_text TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT false,
  version INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone authenticated can view active prompts"
ON public.system_prompts
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all prompts"
ON public.system_prompts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_system_prompts_updated_at
BEFORE UPDATE ON public.system_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. CREATE ADMIN AUDIT LOGS TABLE
-- ============================================

CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_user_id);

-- 6. INSERT DEFAULT PROMPT (migration du prompt actuel de generate-brief-text)
-- ============================================

INSERT INTO public.system_prompts (name, prompt_text, variables, is_active, version)
VALUES (
  'deepseek-brief-generation',
  'Tu es expert dans {{domain}}. 
Génère un texte fluide et naturel prêt à être lu à voix haute.

RÈGLES STRICTES:
- Réponds UNIQUEMENT avec le texte du brief
- AUCUN formatage, AUCUN markdown, AUCUNE balise
- Texte direct pour synthèse vocale
- Style oral et conversationnel
- Ne dépasse jamais {{wordLimit}} mots',
  '{"domain": "string", "wordLimit": "number", "targetWords": "number", "data": "any"}'::jsonb,
  true,
  1
);