import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, TrendingUp, DollarSign, Target, Award } from "lucide-react";

export function ExecutionInsights() {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total_fills: number;
    total_volume_usd: number;
    avg_capture_bps: number;
    chains_traded: string[];
    win_rate: number;
  } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const statsData = await moneyPenny.execution.getStats('24h');
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast({
        title: "Failed to load insights",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Performance Insights</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadStats}
          disabled={loading}
          className="h-7 w-7 p-0"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Total Fills
            </div>
            <div className="text-xl font-bold">{stats.total_fills}</div>
          </div>
          
          <div className="glass-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Volume
            </div>
            <div className="text-xl font-bold">${stats.total_volume_usd.toFixed(2)}</div>
          </div>
          
          <div className="glass-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              Avg Capture
            </div>
            <div className={`text-xl font-bold ${stats.avg_capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.avg_capture_bps.toFixed(2)} bps
            </div>
          </div>
          
          <div className="glass-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              Win Rate
            </div>
            <div className="text-xl font-bold">{(stats.win_rate * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}
    </Card>
  );
}
