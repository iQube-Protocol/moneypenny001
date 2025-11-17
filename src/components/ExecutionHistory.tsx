import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChainChip } from "./ChainChip";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { Intent, Execution } from "@/lib/aigent/moneypenny/modules/execution";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink, Loader2 } from "lucide-react";

export function ExecutionHistory() {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();

  const [intents, setIntents] = useState<Intent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total_fills: number;
    total_volume_usd: number;
    avg_capture_bps: number;
    chains_traded: string[];
    win_rate: number;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [sideFilter, setSideFilter] = useState<string>("all");

  useEffect(() => {
    if (moneyPenny) {
      loadData();
    }

    // Subscribe to real-time execution fill notifications
    const channel = supabase
      .channel('notifications')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          console.log('Real-time execution fill received:', notification);
          // Reload data to show the new execution
          loadData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    if (!moneyPenny) {
      console.log('[ExecutionHistory] No moneyPenny client');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [intentsData, executionsData, statsData] = await Promise.all([
        moneyPenny.execution.listIntents(),
        moneyPenny.execution.listExecutions(50),
        moneyPenny.execution.getStats('24h'),
      ]);

      setIntents(intentsData);
      setExecutions(executionsData);
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

  const filteredIntents = intents.filter((intent) => {
    if (statusFilter !== "all" && intent.status !== statusFilter) return false;
    if (chainFilter !== "all" && intent.chain !== chainFilter) return false;
    if (sideFilter !== "all" && intent.side !== sideFilter) return false;
    return true;
  });

  const filteredExecutions = executions.filter((execution) => {
    if (chainFilter !== "all" && execution.chain !== chainFilter) return false;
    if (sideFilter !== "all" && execution.side !== sideFilter) return false;
    return true;
  });

  const getStatusColor = (status: Intent['status'] | Execution['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning border-warning/40';
      case 'quoted': return 'bg-primary/20 text-primary border-primary/40';
      case 'executing': return 'bg-primary/20 text-primary border-primary/40';
      case 'filled': return 'bg-success/20 text-success border-success/40';
      case 'confirmed': return 'bg-success/20 text-success border-success/40';
      case 'cancelled': return 'bg-muted/20 text-muted-foreground border-muted/40';
      case 'failed': return 'bg-destructive/20 text-destructive border-destructive/40';
      default: return 'bg-muted/20 text-muted-foreground border-muted/40';
    }
  };

  const uniqueChains = Array.from(new Set([...intents.map(i => i.chain), ...executions.map(e => e.chain)]));

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Performance Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Fills</div>
            <div className="text-2xl font-bold">{stats.total_fills}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="text-2xl font-bold">${stats.total_volume_usd.toFixed(2)}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Capture</div>
            <div className={`text-2xl font-bold ${stats.avg_capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.avg_capture_bps.toFixed(2)} bps
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{(stats.win_rate * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="executing">Executing</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chainFilter} onValueChange={setChainFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chain" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Chains</SelectItem>
            {uniqueChains.map(chain => (
              <SelectItem key={chain} value={chain}>{chain.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sideFilter} onValueChange={setSideFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Intents and Executions */}
      <Tabs defaultValue="intents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intents">
            Intents ({filteredIntents.length})
          </TabsTrigger>
          <TabsTrigger value="executions">
            Executions ({filteredExecutions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intents" className="space-y-3 mt-4">
          {filteredIntents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No intents found</p>
              <p className="text-sm mt-1">Submit an intent to get started</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredIntents.map((intent) => (
                <div
                  key={intent.intent_id}
                  className="glass-card p-4 glass-hover space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ChainChip chain={intent.chain} />
                      <div className="flex items-center gap-2">
                        {intent.side === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">{intent.side}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(intent.status)}>
                      {intent.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-mono">{intent.amount_qc} Q¢</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Min Edge</div>
                      <div className="font-mono">{intent.min_edge_bps} bps</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Max Slippage</div>
                      <div className="font-mono">{intent.max_slippage_bps} bps</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Created</div>
                      <div className="text-xs">{new Date(intent.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <code className="text-xs text-muted-foreground font-mono">
                      {intent.intent_id}
                    </code>
                    <div className="text-xs text-muted-foreground">
                      Expires: {new Date(intent.expires_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-3 mt-4">
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No executions found</p>
              <p className="text-sm mt-1">Executions will appear here once intents are filled</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredExecutions.map((execution) => (
                <div
                  key={execution.execution_id}
                  className="glass-card p-4 glass-hover space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ChainChip chain={execution.chain} />
                      <div className="flex items-center gap-2">
                        {execution.side === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">{execution.side}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(execution.status)}>
                      {execution.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Qty Filled</div>
                      <div className="font-mono">{execution.qty_filled.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Price</div>
                      <div className="font-mono">${execution.avg_price.toFixed(5)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Capture</div>
                      <div className={`font-mono ${execution.capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
                        {execution.capture_bps > 0 ? '+' : ''}{execution.capture_bps.toFixed(2)} bps
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Gas Used</div>
                      <div className="font-mono text-xs">{execution.gas_used?.toLocaleString() || 'N/A'}</div>
                    </div>
                  </div>

                  {execution.tx_hash && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <code className="text-xs text-muted-foreground font-mono flex-1 truncate">
                        {execution.tx_hash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/tx/${execution.tx_hash}`, '_blank')}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>ID: {execution.execution_id}</span>
                    <span>{new Date(execution.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
