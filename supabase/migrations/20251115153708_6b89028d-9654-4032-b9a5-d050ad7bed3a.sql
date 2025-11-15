-- Fix function search path for security
DROP TRIGGER IF EXISTS update_trading_intents_updated_at ON public.trading_intents;

DROP FUNCTION IF EXISTS update_trading_intent_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_trading_intent_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_trading_intents_updated_at
  BEFORE UPDATE ON public.trading_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_intent_updated_at();