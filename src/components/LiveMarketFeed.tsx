import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity } from "lucide-react";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { StreamEvent, QuoteEvent, FillEvent, PnLEvent } from "@/lib/aigent/moneypenny/modules/quotes";
import { ChainChip } from "./ChainChip";
import { EdgeGauge } from "./EdgeGauge";
import { InventoryGauge } from "./InventoryGauge";
import { CaptureSparkline } from "./CaptureSparkline";
import { useMarketFeedStore } from "@/stores/marketFeedStore";
import { supabase } from "@/integrations/supabase/client";
import type { Execution } from "@/lib/aigent/moneypenny/modules/execution";

const CHAIN_ICONS = {
  ethereum: '⟠',
  arbitrum: '◆',
  base: '🔵',
  polygon: '⬢',
  optimism: '🔴',
  solana: '◎',
  bitcoin: '₿'
};

const CHAIN_LABELS = {
  ethereum: 'ETH',
  arbitrum: 'ARB',
  base: 'BASE',
  polygon: 'POLY',
  optimism: 'OP',
  solana: 'SOL',
  bitcoin: 'BTC'
};

const AVAILABLE_CHAINS = ['ethereum', 'arbitrum', 'base', 'polygon', 'optimism', 'solana', 'bitcoin'];

export function LiveMarketFeed() {
  const moneyPenny = useMoneyPenny();
  const { selectedChains, qcentEarned, setSelectedChains, addQcentEarned } = useMarketFeedStore();
  const [quotes, setQuotes] = useState<QuoteEvent[]>([]);
  const [fills, setFills] = useState<FillEvent[]>([]);
  const [realExecutions, setRealExecutions] = useState<Execution[]>([]);
  const [captures, setCaptures] = useState<number[]>([]);
  const [currentEdge, setCurrentEdge] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<'SIM' | 'LIVE'>('SIM');
  const [inventoryMin] = useState<number>(0);
  const [inventoryMax] = useState<number>(10000);
  const [currentInventory, setCurrentInventory] = useState<number>(5000);
  const [workingQc, setWorkingQc] = useState<number>(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch real executions on mount
  useEffect(() => {
    const loadExecutions = async () => {
      console.log('[LiveMarketFeed] moneyPenny:', moneyPenny);
      if (!moneyPenny) {
        console.log('[LiveMarketFeed] No moneyPenny client');
        return;
      }
      try {
        console.log('[LiveMarketFeed] Fetching executions...');
        const execs = await moneyPenny.execution.listExecutions(30);
        console.log('[LiveMarketFeed] Executions received:', execs);
        setRealExecutions(execs);
      } catch (error) {
        console.error('[LiveMarketFeed] Failed to load executions:', error);
      }
    };
    loadExecutions();
  }, [moneyPenny]);

  // Subscribe to real-time execution updates
  useEffect(() => {
    const channel = supabase
      .channel('live-market-feed-executions')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          // Reload executions when new fill comes in
          moneyPenny?.execution.listExecutions(30).then(setRealExecutions);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moneyPenny]);

  const startStream = () => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('Starting SSE stream with chains:', selectedChains);
    setIsConnected(false);

    try {
      const eventSource = moneyPenny.quotes.startSimStream(
        selectedChains,
        (event: StreamEvent) => {
          console.log('First message received, marking connected');
          setIsConnected(true);
          handleMessage(event);
        },
        (error: any) => {
          console.error('SSE Error:', error);
          setIsConnected(false);
        }
      );

      console.log('SSE URL:', eventSource.url);
      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  const handleMessage = (msg: StreamEvent) => {
    console.log('SSE Message:', msg.status, msg);

    if (msg.status === 'QUOTE') {
      const quote = msg as QuoteEvent;
      setCurrentEdge(quote.edge_bps || 0);
      setQuotes(prev => [quote, ...prev].slice(0, 20));
    } else if (msg.status === 'FILL') {
      const fill = msg as FillEvent;
      setFills(prev => [fill, ...prev].slice(0, 30));
      
      // Update working Q¢ based on fill
      setWorkingQc(prev => {
        const fillQc = fill.qty_qct || 0;
        const newWorking = fill.side === 'BUY' ? prev + fillQc : prev - fillQc;
        // Update current inventory as well
        setCurrentInventory(newWorking);
        return newWorking;
      });
    } else if (msg.status === 'P&L') {
      const pnl = msg as PnLEvent;
      const captureBps = pnl.capture_bps || 0;
      setCaptures(prev => [...prev, captureBps].slice(-50));
      
      // Calculate Q¢ earned from capture
      if (pnl.capture_bps && pnl.turnover_usd) {
        const qc = (pnl.capture_bps / 10000) * pnl.turnover_usd / (pnl.peg_usd || 0.01);
        addQcentEarned(qc);
      }
    }
  };

  const toggleChain = (chain: string) => {
    const currentChains = selectedChains;
    if (currentChains.includes(chain)) {
      // Don't allow removing last chain
      if (currentChains.length === 1) return;
      setSelectedChains(currentChains.filter(c => c !== chain));
    } else {
      setSelectedChains([...currentChains, chain]);
    }
  };

  const restartStream = () => {
    console.log('Restarting stream with new chains:', selectedChains);
    startStream();
  };

  // Start stream on mount and when chains change
  useEffect(() => {
    startStream();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [selectedChains]);

  const avgCapture = captures.length > 0
    ? captures.reduce((sum, c) => sum + c, 0) / captures.length
    : 0;

  const lastCapture = captures[captures.length - 1] || 0;

  return (
    <div className="space-y-4">
      {/* Header with Connection Status and Chain Selection */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">Live Market Feed</h2>
            <Badge 
              variant="outline" 
              className={`gap-1 backdrop-blur-sm bg-background/30 border-border/40 ${
                isConnected ? 'text-success border-success/20' : 'text-muted-foreground'
              }`}
            >
              <Activity className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
            <Badge variant="outline">{mode}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ({selectedChains.length}/{AVAILABLE_CHAINS.length})
            </span>
            {AVAILABLE_CHAINS.map(chain => (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1
                  ${selectedChains.includes(chain)
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border border-border/30 opacity-50'
                  }
                `}
                title={chain}
              >
                <span>{CHAIN_ICONS[chain as keyof typeof CHAIN_ICONS]}</span>
                <span className="font-semibold">{CHAIN_LABELS[chain as keyof typeof CHAIN_LABELS]}</span>
              </button>
            ))}
          </div>

          <Button 
            size="sm" 
            variant="ghost" 
            onClick={restartStream}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Restart
          </Button>
        </div>
      </Card>

      {/* Monitoring Dashboard */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Edge Gauge */}
        <Card className="glass-card p-4">
          <div className="text-sm font-semibold mb-3 text-foreground">Edge Gauge</div>
          <EdgeGauge 
            floorBps={0.5} 
            minEdgeBps={1.0} 
            liveEdgeBps={currentEdge} 
          />
        </Card>

        {/* Inventory Gauge */}
        <Card className="glass-card p-4">
          <div className="text-sm font-semibold mb-3 text-foreground">Inventory Status</div>
          <InventoryGauge
            inventoryMin={inventoryMin}
            inventoryMax={inventoryMax}
            currentInventory={currentInventory}
            workingQc={workingQc}
          />
        </Card>
      </div>

      {/* Performance Dashboard */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Q¢ Accumulated */}
        <Card className="glass-card p-4">
          <div className="text-sm font-semibold mb-3 text-foreground">Q¢ Accumulated</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-success">
              {qcentEarned.toFixed(2)} Q¢
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total earned today
            </div>
          </div>
        </Card>

        {/* Capture Performance */}
        <Card className="glass-card p-4">
          <div className="text-sm font-semibold mb-3 text-foreground">Capture Performance</div>
          <div className="relative h-20 flex items-end gap-0.5">
            {captures.slice(-30).map((capture, idx) => {
              const maxCapture = Math.max(...captures, 1);
              const heightPercent = (Math.abs(capture) / maxCapture) * 100;
              
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t transition-all ${
                    capture > 0 
                      ? 'bg-success hover:bg-success/80' 
                      : 'bg-destructive hover:bg-destructive/80'
                  }`}
                  style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  title={`${capture.toFixed(2)} bps`}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-3">
            <div>
              <span className="text-muted-foreground">Last:</span>
              <span className="font-bold text-foreground ml-1">{lastCapture.toFixed(2)} bps</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-bold text-foreground ml-1">{avgCapture.toFixed(2)} bps</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 24-Hour Trade History */}
      <CaptureSparkline />

      {/* Live Quotes Feed and Recent Fills - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Quotes Feed */}
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Live Quotes</h3>
            <Badge variant="outline" className="text-xs">{quotes.length} recent</Badge>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {quotes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Waiting for quotes...
              </div>
            ) : (
              quotes.map((quote, idx) => (
                <div 
                  key={`${quote.chain}-${quote.ts}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {CHAIN_ICONS[quote.chain as keyof typeof CHAIN_ICONS]}
                    </span>
                    <span className="text-xs font-medium text-foreground capitalize">
                      {quote.chain}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {quote.qty_qc.toFixed(2)} Q¢
                    </span>
                    <span className={`text-xs font-bold ${
                      quote.edge_bps > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {quote.edge_bps.toFixed(2)} bps
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(quote.ts).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Fills */}
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Fills</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10">
                {realExecutions.length} LIVE
              </Badge>
              <Badge variant="outline" className="text-xs bg-muted/50">
                {fills.length} SIM
              </Badge>
            </div>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {/* Real Executions First (LIVE) */}
            {realExecutions.map((exec, idx) => (
              <div 
                key={`live-${exec.execution_id}-${idx}`}
                className="flex items-center gap-2 px-3 py-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors border-l-2 border-primary"
              >
                <Badge className="bg-primary text-primary-foreground text-xs">
                  LIVE
                </Badge>
                <Badge 
                  variant={exec.side === 'BUY' ? 'default' : 'secondary'}
                  className={`${exec.side === 'BUY' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}
                >
                  {exec.side}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    {CHAIN_ICONS[exec.chain as keyof typeof CHAIN_ICONS]}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {CHAIN_LABELS[exec.chain as keyof typeof CHAIN_LABELS]}
                  </span>
                </div>
                <span className="text-xs font-mono text-foreground">
                  {exec.qty_filled.toFixed(2)} Q¢
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ${exec.avg_price.toFixed(5)}
                </span>
                <span className={`text-xs font-bold ${exec.capture_bps > 0 ? 'text-success' : 'text-destructive'}`}>
                  {exec.capture_bps > 0 ? '+' : ''}{exec.capture_bps.toFixed(2)} bps
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(exec.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}

            {/* Simulation Fills */}
            {fills.length === 0 && realExecutions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No fills yet...
              </div>
            ) : (
              fills.map((fill, idx) => (
                <div 
                  key={`sim-${fill.chain}-${fill.ts}-${idx}`}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Badge 
                    variant={fill.side === 'BUY' ? 'default' : 'secondary'}
                    className={`${fill.side === 'BUY' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}
                  >
                    {fill.side}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {CHAIN_ICONS[fill.chain as keyof typeof CHAIN_ICONS]}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {CHAIN_LABELS[fill.chain as keyof typeof CHAIN_LABELS]}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-foreground">
                    {fill.qty_qct.toFixed(2)} Q¢
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    ${fill.price_usdc.toFixed(5)}
                  </span>
                  <span className="text-xs font-bold text-success">
                    +{fill.capture_bps.toFixed(2)} bps
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(fill.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
