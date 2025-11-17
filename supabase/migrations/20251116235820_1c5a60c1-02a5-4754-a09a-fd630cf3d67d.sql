-- Create recommendation_history table for tracking AI suggestions over time
CREATE TABLE IF NOT EXISTS public.recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommendation_id UUID REFERENCES public.trading_recommendations(id) ON DELETE CASCADE,
  inventory_min NUMERIC NOT NULL,
  inventory_max NUMERIC NOT NULL,
  min_edge_bps NUMERIC NOT NULL,
  max_notional_usd NUMERIC NOT NULL,
  daily_loss_limit_bps NUMERIC NOT NULL,
  reasoning TEXT,
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create policy_applications table for tracking when users apply recommendations
CREATE TABLE IF NOT EXISTS public.policy_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommendation_id UUID REFERENCES public.trading_recommendations(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  previous_policy JSONB,
  applied_policy JSONB,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for recommendation_history
CREATE POLICY "Users can view their own recommendation history"
  ON public.recommendation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation history"
  ON public.recommendation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for policy_applications
CREATE POLICY "Users can view their own policy applications"
  ON public.policy_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own policy applications"
  ON public.policy_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON public.transactions(user_id, amount);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_user ON public.recommendation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_applications_user ON public.policy_applications(user_id, applied_at DESC);