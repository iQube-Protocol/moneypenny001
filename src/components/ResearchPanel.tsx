import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ResearchMemo, ResearchResponse } from '@/lib/aigent/core/types/research';
import { StrategyComparison } from './StrategyComparison';
import { useToast } from '@/hooks/use-toast';

interface ResearchPanelProps {
  onStrategyUpdate?: (strategy: any) => void;
}

export function ResearchPanel({ onStrategyUpdate }: ResearchPanelProps) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState<any>(null);
  const { toast } = useToast();

  const handleResearch = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<any>('research-agent', {
        body: { topic, maxResults: 5 },
      });
      
      if (error) throw error;
      if (data?.memo) {
        setMemo(data.memo);
        toast({
          title: "Research Complete",
          description: `Strategy: ${data.memo.strategy?.action || 'hold'}`,
        });
      }
    } catch (error) {
      console.error('Research error:', error);
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'kybe': return 'bg-purple-500';
      case 'root': return 'bg-blue-500';
      case 'persona': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return { label: 'Low', color: 'text-success' };
    if (score < 60) return { label: 'Medium', color: 'text-warning' };
    return { label: 'High', color: 'text-destructive' };
  };

  const getTrustLevel = (score: number) => {
    if (score > 70) return { label: 'High', color: 'text-success' };
    if (score > 40) return { label: 'Medium', color: 'text-warning' };
    return { label: 'Low', color: 'text-destructive' };
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Research Agent
        </CardTitle>
        <CardDescription>
          Get market intelligence with risk/trust scoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="What's your view on ETH vs SOL this week?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
            disabled={loading}
          />
          <Button onClick={handleResearch} disabled={loading || !topic.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Quick Link Examples */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTopic("What's your view on ETH this week?")}
            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
            disabled={loading}
          >
            ETH outlook?
          </button>
          <button
            onClick={() => setTopic("Should I buy BTC now or wait?")}
            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
            disabled={loading}
          >
            BTC buy signal?
          </button>
          <button
            onClick={() => setTopic("Is SOL bullish or bearish this month?")}
            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
            disabled={loading}
          >
            SOL trend?
          </button>
        </div>

        {memo && (
          <div className="space-y-4">
            {/* Strategy Recommendation */}
            {memo.strategy && (
              <StrategyComparison
                current={memo.strategy}
                previous={memo.previousStrategy}
                onApply={(strategy) => {
                  if (onStrategyUpdate) {
                    onStrategyUpdate(strategy);
                    toast({
                      title: "Strategy Applied",
                      description: "Intent form updated",
                    });
                  }
                }}
              />
            )}
            
            {/* iQube Scoring */}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={getTierColor(memo.iq_tier)}>
                {memo.iq_tier.toUpperCase()} Tier
              </Badge>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Risk:</span>
                <span className={`text-sm font-medium ${getRiskLevel(memo.iq_risk_score).color}`}>
                  {getRiskLevel(memo.iq_risk_score).label} ({memo.iq_risk_score})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Trust:</span>
                <span className={`text-sm font-medium ${getTrustLevel(memo.iq_trust_score).color}`}>
                  {getTrustLevel(memo.iq_trust_score).label} ({memo.iq_trust_score})
                </span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-sm font-medium mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{memo.summary}</p>
            </div>

            {/* Key Points */}
            <div>
              <h3 className="text-sm font-medium mb-2">Key Insights</h3>
              <ul className="space-y-1">
                {memo.bullets.map((bullet, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{bullet}</li>
                ))}
              </ul>
            </div>

            {/* Citations */}
            <div>
              <h3 className="text-sm font-medium mb-2">Sources ({memo.citations.length})</h3>
              <div className="space-y-2">
                {memo.citations.map((citation, i) => (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{citation.title}</p>
                      {citation.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{citation.snippet}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {memo.tags?.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
