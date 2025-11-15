-- Create cache_store table for oracle data caching
CREATE TABLE IF NOT EXISTS public.cache_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_cache_store_expires_at ON public.cache_store(expires_at);

-- Enable RLS (but allow public read/write for function use)
ALTER TABLE public.cache_store ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to cache_store"
  ON public.cache_store
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
