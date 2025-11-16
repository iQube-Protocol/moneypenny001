-- Create bank_statements table to store uploaded statements
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  closing_balance NUMERIC,
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table to store individual transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create financial_aggregates table to store computed aggregates
CREATE TABLE IF NOT EXISTS public.financial_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  avg_daily_surplus NUMERIC DEFAULT 0,
  surplus_volatility NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  cash_buffer_days NUMERIC DEFAULT 0,
  top_categories JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC DEFAULT 0,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trading_recommendations table to store AI-generated recommendations
CREATE TABLE IF NOT EXISTS public.trading_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  inventory_min NUMERIC NOT NULL,
  inventory_max NUMERIC NOT NULL,
  min_edge_bps NUMERIC NOT NULL,
  daily_loss_limit_bps NUMERIC NOT NULL,
  max_notional_usd NUMERIC NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_statements
CREATE POLICY "Users can view their own statements"
  ON public.bank_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statements"
  ON public.bank_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statements"
  ON public.bank_statements FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for financial_aggregates
CREATE POLICY "Users can view their own aggregates"
  ON public.financial_aggregates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own aggregates"
  ON public.financial_aggregates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aggregates"
  ON public.financial_aggregates FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for trading_recommendations
CREATE POLICY "Users can view their own recommendations"
  ON public.trading_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own recommendations"
  ON public.trading_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.trading_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_statement_id ON public.transactions(statement_id);
CREATE INDEX idx_financial_aggregates_user_id ON public.financial_aggregates(user_id);
CREATE INDEX idx_trading_recommendations_user_id ON public.trading_recommendations(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_aggregates_updated_at
  BEFORE UPDATE ON public.financial_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_recommendations_updated_at
  BEFORE UPDATE ON public.trading_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();