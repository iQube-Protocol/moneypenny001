-- Create intents table for tracking trading intents
CREATE TABLE public.trading_intents (
  intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  amount_qc DECIMAL(20, 8) NOT NULL,
  min_edge_bps DECIMAL(10, 4) NOT NULL,
  max_slippage_bps DECIMAL(10, 4) NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'MARKET' CHECK (order_type IN ('MARKET', 'LIMIT')),
  limit_price DECIMAL(20, 8),
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  time_in_force TEXT NOT NULL DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'DAY')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'executing', 'filled', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create executions table for tracking trade executions
CREATE TABLE public.trading_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES public.trading_intents(intent_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  qty_filled DECIMAL(20, 8) NOT NULL,
  avg_price DECIMAL(20, 8) NOT NULL,
  capture_bps DECIMAL(10, 4) NOT NULL,
  tx_hash TEXT,
  gas_used BIGINT,
  dex TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_intents
CREATE POLICY "Users can view their own intents"
  ON public.trading_intents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intents"
  ON public.trading_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intents"
  ON public.trading_intents FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for trading_executions
CREATE POLICY "Users can view their own executions"
  ON public.trading_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own executions"
  ON public.trading_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_trading_intents_user_status ON public.trading_intents(user_id, status);
CREATE INDEX idx_trading_intents_chain ON public.trading_intents(chain);
CREATE INDEX idx_trading_intents_created_at ON public.trading_intents(created_at DESC);
CREATE INDEX idx_trading_executions_intent ON public.trading_executions(intent_id);
CREATE INDEX idx_trading_executions_user ON public.trading_executions(user_id);
CREATE INDEX idx_trading_executions_timestamp ON public.trading_executions(timestamp DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trading_intent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_trading_intents_updated_at
  BEFORE UPDATE ON public.trading_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_intent_updated_at();