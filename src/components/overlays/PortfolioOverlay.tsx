import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Activity, Percent } from "lucide-react";
import { PortfolioAnalytics } from "@/components/PortfolioAnalytics";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PortfolioOverlay() {
  const moneyPenny = useMoneyPenny();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch execution stats
  useEffect(() => {
    const loadStats = async () => {
      console.log('[Portfolio] moneyPenny:', moneyPenny);
      if (!moneyPenny) {
        console.log('[Portfolio] No moneyPenny client');
        return;
      }
      
      try {
        console.log('[Portfolio] Fetching stats...');
        const executionStats = await moneyPenny.execution.getStats('24h');
        console.log('[Portfolio] Stats received:', executionStats);
        setStats(executionStats);
      } catch (error) {
        console.error('[Portfolio] Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('portfolio-stats-updates')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          loadStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moneyPenny]);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Portfolio</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time portfolio performance and analytics
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Fills</p>
              <p className="text-lg font-bold">
                {loading ? '...' : stats?.total_fills || 0}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume (24h)</p>
              <p className="text-lg font-bold">
                {loading ? '...' : `$${(stats?.total_volume_usd || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Capture</p>
              <p className="text-lg font-bold">
                {loading ? '...' : `${(stats?.avg_capture_bps || 0).toFixed(2)} bps`}
              </p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-bold">
                {loading ? '...' : `${((stats?.win_rate || 0) * 100).toFixed(1)}%`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <PortfolioAnalytics />
    </div>
  );
}
