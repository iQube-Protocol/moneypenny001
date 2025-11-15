-- Temporarily allow public access to trading tables for demo
-- This bypasses authentication so the trading functionality can be tested
-- IMPORTANT: Re-enable proper auth before production!

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own intents" ON public.trading_intents;
DROP POLICY IF EXISTS "Users can insert their own intents" ON public.trading_intents;
DROP POLICY IF EXISTS "Users can update their own intents" ON public.trading_intents;

DROP POLICY IF EXISTS "Users can view their own executions" ON public.trading_executions;
DROP POLICY IF EXISTS "Users can insert their own executions" ON public.trading_executions;

-- Create public access policies for demo (TEMPORARY)
CREATE POLICY "Public read access to intents (DEMO ONLY)"
  ON public.trading_intents FOR SELECT
  USING (true);

CREATE POLICY "Public insert access to intents (DEMO ONLY)"
  ON public.trading_intents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to intents (DEMO ONLY)"
  ON public.trading_intents FOR UPDATE
  USING (true);

CREATE POLICY "Public read access to executions (DEMO ONLY)"
  ON public.trading_executions FOR SELECT
  USING (true);

CREATE POLICY "Public insert access to executions (DEMO ONLY)"
  ON public.trading_executions FOR INSERT
  WITH CHECK (true);