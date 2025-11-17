-- Create agent_memories table for storing insights and decisions
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('profile', 'trade', 'daily_summary', 'glossary', 'preference', 'insight', 'decision')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_agent_memories_user_id ON public.agent_memories(user_id);
CREATE INDEX idx_agent_memories_type ON public.agent_memories(type);
CREATE INDEX idx_agent_memories_created_at ON public.agent_memories(created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_memories
CREATE POLICY "Users can view their own memories"
  ON public.agent_memories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON public.agent_memories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON public.agent_memories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable real-time for trading_executions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_executions;

-- Enable real-time for agent_memories table
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_memories;