import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChainChip } from "./ChainChip";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { Intent, Execution } from "@/lib/aigent/moneypenny/modules/execution";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RefreshCw, TrendingUp, TrendingDown, Loader2, DollarSign, Target, Award } from "lucide-react";

export function ExecutionHistoryCompact() {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();

  const [intents, setIntents] = useState<Intent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'intents' | 'executions'>('intents');
  const [stats, setStats] = useState<{
    total_fills: number;
    total_volume_usd: number;
    avg_capture_bps: number;
    chains_traded: string[];
    win_rate: number;
  } | null>(null);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('notifications')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          loadData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [intentsData, executionsData, statsData] = await Promise.all([
        moneyPenny.execution.listIntents(),
        moneyPenny.execution.listExecutions(20),
        moneyPenny.execution.getStats('24h'),
      ]);

      setIntents(intentsData.slice(0, 10));
      setExecutions(executionsData.slice(0, 10));
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load execution history:', error);
      toast({
        title: "Failed to load history",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Intent['status'] | Execution['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning border-warning/40';
      case 'filled': return 'bg-success/20 text-success border-success/40';
      case 'confirmed': return 'bg-success/20 text-success border-success/40';
      case 'cancelled': return 'bg-muted/20 text-muted-foreground border-muted/40';
      case 'failed': return 'bg-destructive/20 text-destructive border-destructive/40';
      default: return 'bg-muted/20 text-muted-foreground border-muted/40';
    }
  };

  const items = activeTab === 'intents' ? intents : executions;

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          
          {/* Performance Stats Inline */}
          {stats && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 glass-card">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Fills:</span>
                <span className="font-bold">{stats.total_fills}</span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2 py-1 glass-card">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Vol:</span>
                <span className="font-bold">${stats.total_volume_usd.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2 py-1 glass-card">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Avg:</span>
                <span className={`font-bold ${stats.avg_capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.avg_capture_bps.toFixed(2)} bps
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2 py-1 glass-card">
                <Award className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Win:</span>
                <span className="font-bold">{(stats.win_rate * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={activeTab === 'intents' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('intents')}
              className="h-6 text-xs px-2"
            >
              Intents ({intents.length})
            </Button>
            <Button
              variant={activeTab === 'executions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('executions')}
              className="h-6 text-xs px-2"
            >
              Fills ({executions.length})
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
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
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {items.length === 0 ? (
            <div className="w-full text-center py-4 text-xs text-muted-foreground">
              No {activeTab} found
            </div>
          ) : (
            items.map((item) => (
              <div
                key={'intent_id' in item ? item.intent_id : item.execution_id}
                className="glass-card p-3 min-w-[200px] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <ChainChip chain={item.chain} />
                  <Badge className={`${getStatusColor(item.status)} text-xs px-1.5 py-0`}>
                    {item.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.side === 'BUY' ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs font-medium">{item.side}</span>
                  <span className="text-xs font-mono ml-auto">
                    {'intent_id' in item ? item.amount_qc : item.qty_filled} Q¢
                  </span>
                </div>

                {activeTab === 'executions' && 'avg_price' in item && (
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-mono">${item.avg_price.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capture:</span>
                      <span className={`font-mono ${item.capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
                        {item.capture_bps.toFixed(2)} bps
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {'intent_id' in item 
                    ? new Date(item.created_at).toLocaleTimeString()
                    : new Date(item.timestamp).toLocaleTimeString()
                  }
                </div>
              </div>
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
