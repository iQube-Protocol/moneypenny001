import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletDrawer } from "@/components/WalletDrawer";
import { ChainChip } from "@/components/ChainChip";
import { EdgeGauge } from "@/components/EdgeGauge";
import { QuotesTable } from "@/components/QuotesTable";
import { FillsTicker } from "@/components/FillsTicker";
import { CaptureSparkline } from "@/components/CaptureSparkline";
import { IntentForm } from "@/components/IntentForm";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import { MoneyPennyChat } from "@/components/MoneyPennyChat";
import { FIOManager } from "@/components/FIOManager";
import { RiskDashboard } from "@/components/RiskDashboard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MessageSquare, Activity, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { QuoteEvent, FillEvent, PnLEvent } from "@/lib/aigent/moneypenny/modules/quotes";
import { useToast } from "@/hooks/use-toast";

const chains = ["eth", "arb", "base", "op", "poly", "btc", "sol"];

export default function Console() {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  
  const [selectedChains, setSelectedChains] = useState<string[]>(["eth", "arb", "base"]);
  const [mode, setMode] = useState<"SIM" | "LIVE">("SIM");
  const [isStreaming, setIsStreaming] = useState(false);
  const [quotes, setQuotes] = useState<QuoteEvent[]>([]);
  const [fills, setFills] = useState<FillEvent[]>([]);
  const [captureData, setCaptureData] = useState<{ timestamp: string; captureBps: number }[]>([]);
  const [totalQc, setTotalQc] = useState(0);
  const [pnlData, setPnlData] = useState<PnLEvent | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Handle stream events
  const handleStreamEvent = (event: QuoteEvent | FillEvent | PnLEvent) => {
    console.log('Stream event received:', event);
    
    if (event.status === 'QUOTE') {
      setQuotes(prev => [event, ...prev].slice(0, 20));
    } else if (event.status === 'FILL') {
      setFills(prev => [event, ...prev].slice(0, 10));
      setTotalQc(prev => prev + Math.abs(event.capture_bps * event.qty_qct / 100));
      
      setCaptureData(prev => [...prev, {
        timestamp: event.ts,
        captureBps: event.capture_bps,
      }].slice(-50));
    } else if (event.status === 'P&L') {
      setPnlData(event);
    }
  };

  // Start/Stop stream
  const toggleStream = () => {
    if (isStreaming) {
      // Stop stream
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
      toast({
        title: "Stream stopped",
        description: "Quote stream has been stopped",
      });
    } else {
      // Start stream
      if (selectedChains.length === 0) {
        toast({
          title: "No chains selected",
          description: "Please select at least one chain to stream quotes",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log('Starting quote stream for chains:', selectedChains);
        
        if (mode === "SIM") {
          eventSourceRef.current = moneyPenny.quotes.startSimStream(
            selectedChains,
            handleStreamEvent,
            (error) => {
              console.error('Stream error:', error);
              toast({
                title: "Stream error",
                description: "Quote stream encountered an error",
                variant: "destructive",
              });
              setIsStreaming(false);
            }
          );
        } else {
          // LIVE mode would require session_id
          toast({
            title: "LIVE mode unavailable",
            description: "LIVE mode requires authentication. Using SIM mode.",
            variant: "destructive",
          });
          return;
        }

        setIsStreaming(true);
        toast({
          title: "Stream started",
          description: `Streaming quotes for ${selectedChains.length} chains`,
        });
      } catch (error) {
        console.error('Failed to start stream:', error);
        toast({
          title: "Failed to start stream",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-stop stream when chains change
  useEffect(() => {
    if (isStreaming && eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsStreaming(false);
      toast({
        title: "Stream reset",
        description: "Stream stopped due to chain selection change",
      });
    }
  }, [selectedChains]);

  const toggleChain = (chain: string) => {
    if (isStreaming) {
      toast({
        title: "Stop stream first",
        description: "Please stop the stream before changing chains",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedChains(prev =>
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold neon-text">Aigent MoneyPenny Q¢ Trading Console</h1>
              <p className="text-sm text-muted-foreground mt-1">
                QriptoCENT (Q¢) micro-slippage trading agent. Get quotes, submit intents, and monitor execution.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/profile">
                <Button variant="outline" size="sm">Profile</Button>
              </Link>
              <NotificationCenter />
              <Badge variant={mode === "LIVE" ? "destructive" : "secondary"} className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                {mode} MODE
              </Badge>
              <WalletDrawer />
              <Button size="sm" variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                MoneyPenny Chat
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Console */}
      <main className="container mx-auto px-6 py-6">
        {/* Chain Selector */}
        <div className="mb-6 glass-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Chain Portfolio</h3>
          <div className="flex flex-wrap gap-2">
            {chains.map(chain => (
              <ChainChip
                key={chain}
                chain={chain}
                active={selectedChains.includes(chain)}
                onClick={() => toggleChain(chain)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <EdgeGauge
              floorBps={0.65}
              minEdgeBps={1.0}
              liveEdgeBps={1.42}
            />
            <QuotesTable quotes={quotes.map(q => ({
              chain: q.chain,
              edgeBps: q.edge_bps,
              price: q.price_usdc,
              qty: q.qty_qc,
              timestamp: q.ts,
            }))} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <IntentForm availableChains={selectedChains} />
            <CaptureSparkline data={captureData} totalQc={totalQc} />
            <FillsTicker fills={fills.map(f => ({
              side: f.side,
              chain: f.chain,
              qty: f.qty_qct,
              price: f.price_usdc,
              captureBps: f.capture_bps,
              timestamp: f.ts,
            }))} />
          </div>
        </div>

        {/* Execution History */}
        <div className="mt-6">
          <ExecutionHistory />
        </div>

        {/* MoneyPenny Chat */}
        <div className="mt-6">
          <MoneyPennyChat />
        </div>

        {/* FIO Handle Management */}
        <div className="mt-6">
          <FIOManager />
        </div>

        {/* Risk Dashboard */}
        <div className="mt-6">
          <RiskDashboard />
        </div>
      </main>
    </div>
  );
}
