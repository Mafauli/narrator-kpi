-- Create onboarding table for AI-powered onboarding
CREATE TABLE public.onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  infer_json JSONB,
  final_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own onboarding"
ON public.onboarding
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
ON public.onboarding
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
ON public.onboarding
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_updated_at
BEFORE UPDATE ON public.onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();