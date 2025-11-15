import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletDrawer } from "@/components/WalletDrawer";
import { ChainChip } from "@/components/ChainChip";
import { EdgeGauge } from "@/components/EdgeGauge";
import { QuotesTable } from "@/components/QuotesTable";
import { FillsTicker } from "@/components/FillsTicker";
import { CaptureSparkline } from "@/components/CaptureSparkline";
import { MessageSquare, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const chains = ["eth", "arb", "base", "op", "poly", "btc", "sol"];

export default function Console() {
  const [selectedChains, setSelectedChains] = useState<string[]>(["eth", "arb", "base"]);
  const [mode, setMode] = useState<"SIM" | "LIVE">("SIM");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [fills, setFills] = useState<any[]>([]);
  const [captureData, setCaptureData] = useState<any[]>([]);
  const [totalQc, setTotalQc] = useState(0);

  // Generate mock real-time data
  useEffect(() => {
    const generateQuote = () => ({
      chain: selectedChains[Math.floor(Math.random() * selectedChains.length)],
      edgeBps: Math.random() * 3,
      price: 0.01 + Math.random() * 0.0001,
      qty: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString(),
    });

    const generateFill = () => ({
      side: Math.random() > 0.5 ? "BUY" : "SELL",
      chain: selectedChains[Math.floor(Math.random() * selectedChains.length)],
      qty: Math.floor(Math.random() * 500) + 50,
      price: 0.01 + Math.random() * 0.0001,
      captureBps: Math.random() * 2 - 0.5,
      timestamp: new Date().toISOString(),
    });

    const quoteInterval = setInterval(() => {
      setQuotes(prev => [generateQuote(), ...prev].slice(0, 20));
    }, 2000);

    const fillInterval = setInterval(() => {
      const newFill = generateFill();
      setFills(prev => [newFill, ...prev].slice(0, 10));
      setTotalQc(prev => prev + Math.abs(newFill.captureBps * newFill.qty / 100));
      
      setCaptureData(prev => [...prev, {
        timestamp: new Date().toISOString(),
        captureBps: newFill.captureBps,
      }].slice(-50));
    }, 5000);

    return () => {
      clearInterval(quoteInterval);
      clearInterval(fillInterval);
    };
  }, [selectedChains]);

  const toggleChain = (chain: string) => {
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
            <QuotesTable quotes={quotes} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <CaptureSparkline data={captureData} totalQc={totalQc} />
            <FillsTicker fills={fills} />
          </div>
        </div>
      </main>
    </div>
  );
}
