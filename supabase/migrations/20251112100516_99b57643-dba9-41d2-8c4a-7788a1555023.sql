-- Create Shopify connections table
CREATE TABLE public.connections_shopify (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  scopes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Shopify KPIs cache table
CREATE TABLE public.shopify_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  week_start DATE NOT NULL,
  kpis_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.connections_shopify ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_kpis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections_shopify
CREATE POLICY "Users can view their own Shopify connections"
  ON public.connections_shopify FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Shopify connections"
  ON public.connections_shopify FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Shopify connections"
  ON public.connections_shopify FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Shopify connections"
  ON public.connections_shopify FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for shopify_kpis
CREATE POLICY "Users can view their own Shopify KPIs"
  ON public.shopify_kpis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Shopify KPIs"
  ON public.shopify_kpis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Shopify KPIs"
  ON public.shopify_kpis FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_connections_shopify_user_id ON public.connections_shopify(user_id);
CREATE INDEX idx_shopify_kpis_user_id ON public.shopify_kpis(user_id);
CREATE INDEX idx_shopify_kpis_week_start ON public.shopify_kpis(week_start);

-- Trigger for updated_at
CREATE TRIGGER update_connections_shopify_updated_at
  BEFORE UPDATE ON public.connections_shopify
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();