import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for Tavily results
const cache = new Map<string, { data: any; expires: number }>();

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface IQubeRiskTrust {
  iq_risk_score: number;
  iq_trust_score: number;
  iq_tier: 'anonymous' | 'persona' | 'root' | 'kybe';
  tags: string[];
}

function generateRiskTrustScore(
  citations: TavilyResult[],
  hasPriorHistory: boolean
): IQubeRiskTrust {
  // Simple heuristic scoring
  const avgScore = citations.reduce((sum, c) => sum + c.score, 0) / citations.length;
  const sourceDiversity = new Set(citations.map(c => new URL(c.url).hostname)).size;
  
  // Base scores
  let riskScore = 60; // Start at medium risk
  let trustScore = 50;
  let tier: IQubeRiskTrust['iq_tier'] = 'anonymous';
  
  // Adjust based on quality
  if (avgScore > 0.8) {
    riskScore -= 20;
    trustScore += 20;
  }
  
  // Adjust based on diversity
  if (sourceDiversity >= 3) {
    riskScore -= 10;
    trustScore += 15;
    tier = 'persona';
  }
  
  // Adjust based on prior history
  if (hasPriorHistory) {
    riskScore -= 10;
    trustScore += 15;
  }
  
  // Cap values
  riskScore = Math.max(0, Math.min(100, riskScore));
  trustScore = Math.max(0, Math.min(100, trustScore));
  
  return {
    iq_risk_score: riskScore,
    iq_trust_score: trustScore,
    iq_tier: tier,
    tags: ['market', 'source:tavily', 'research']
  };
}

async function searchTavily(query: string, maxResults: number = 5): Promise<TavilyResult[]> {
  const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY not configured');
  }
  
  const cacheKey = `tavily:${query}:${maxResults}`;
  const now = Date.now();
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) {
    console.log('Cache hit for:', query);
    return cached.data;
  }
  
  console.log('Tavily search for:', query);
  
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
      include_raw_content: false,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  const results: TavilyResult[] = data.results || [];
  
  // Cache for 5 minutes
  cache.set(cacheKey, {
    data: results,
    expires: now + 5 * 60 * 1000,
  });
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { topic, scope, maxResults = 5 } = await req.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Research request:', { topic, scope, maxResults });
    
    // Search Tavily
    const results = await searchTavily(topic, maxResults);
    
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No results found for topic' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate summary and bullets
    const summary = `Research on ${topic}: Found ${results.length} sources with insights from ${new Set(results.map(r => new URL(r.url).hostname)).size} different domains.`;
    
    const bullets = results.slice(0, 3).map((r, i) => {
      const snippet = r.content.slice(0, 150);
      return `${i + 1}. ${snippet}${snippet.length < r.content.length ? '...' : ''}`;
    });
    
    // Build citations
    const citations = results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content.slice(0, 200),
      published_date: r.published_date,
    }));
    
    // Generate risk/trust scores
    const riskTrust = generateRiskTrustScore(results, false); // TODO: check prior history
    
    // Build research memo
    const memo = {
      id: crypto.randomUUID(),
      scope: scope || 'default',
      topic,
      summary,
      bullets,
      citations,
      created_at: new Date().toISOString(),
      ...riskTrust,
    };
    
    // Store in memories (using Supabase cache_store as simple storage)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('cache_store').upsert({
      key: `research:${scope}:${memo.id}`,
      value: JSON.stringify(memo),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    });
    
    console.log('Research memo created:', memo.id);
    
    return new Response(
      JSON.stringify({ memo, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Research agent error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
