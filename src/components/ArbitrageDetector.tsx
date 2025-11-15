import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChainChip } from "./ChainChip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ArrowRightLeft, Zap, AlertCircle, RefreshCw } from "lucide-react";

interface ArbitrageOpportunity {
  id: string;
  asset: string;
  buyChain: string;
  buyDex: string;
  buyPrice: number;
  sellChain: string;
  sellDex: string;
  sellPrice: number;
  spreadBps: number;
  netProfitBps: number;
  estimatedGasCost: number;
  confidence: number;
  timestamp: string;
}

export function ArbitrageDetector() {
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [minProfitBps, setMinProfitBps] = useState<string>("10");

  const assets = ["USDC", "USDT", "DAI", "ETH", "WBTC"];
  const chains = ["eth", "polygon", "arbitrum", "optimism", "base", "avalanche", "bsc"];

  const scanArbitrage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("arbitrage-scanner", {
        body: {
          asset: selectedAsset === "all" ? undefined : selectedAsset,
          minProfitBps: parseFloat(minProfitBps),
          chains: chains,
        },
      });

      if (error) throw error;

      setOpportunities(data.opportunities || []);

      if (data.opportunities.length === 0) {
        toast({
          title: "No opportunities found",
          description: "Try lowering the minimum profit threshold",
        });
      } else {
        toast({
          title: "Scan complete",
          description: `Found ${data.opportunities.length} arbitrage opportunities`,
        });
      }
    } catch (error) {
      console.error("Failed to scan arbitrage:", error);
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(scanArbitrage, 15000); // Scan every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedAsset, minProfitBps]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-success/20 text-success border-success/40";
    if (confidence >= 60) return "bg-warning/20 text-warning border-warning/40";
    return "bg-muted/20 text-muted-foreground border-muted/40";
  };

  const getProfitColor = (netProfitBps: number) => {
    if (netProfitBps >= 50) return "text-success";
    if (netProfitBps >= 20) return "text-primary";
    return "text-warning";
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Arbitrage Detector
            </CardTitle>
            <CardDescription>
              Real-time cross-chain arbitrage opportunity scanner
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              onClick={scanArbitrage}
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Scan Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="asset-select" className="text-sm mb-2 block">
              Asset
            </Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset-select">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="min-profit" className="text-sm mb-2 block">
              Min Profit (bps)
            </Label>
            <Select value={minProfitBps} onValueChange={setMinProfitBps}>
              <SelectTrigger id="min-profit">
                <SelectValue placeholder="Select minimum profit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 bps</SelectItem>
                <SelectItem value="10">10 bps</SelectItem>
                <SelectItem value="20">20 bps</SelectItem>
                <SelectItem value="50">50 bps</SelectItem>
                <SelectItem value="100">100 bps (1%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-3">
          {opportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No arbitrage opportunities found</p>
              <p className="text-sm mt-1">Click "Scan Now" to search for opportunities</p>
            </div>
          ) : (
            opportunities.map((opp) => (
              <Card key={opp.id} className="glass-card border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-primary">
                        {opp.asset}
                      </div>
                      <Badge className={getConfidenceColor(opp.confidence)}>
                        {opp.confidence}% confidence
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getProfitColor(opp.netProfitBps)}`}>
                        +{opp.netProfitBps.toFixed(2)} bps
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Net profit after gas
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Buy Side */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        BUY FROM
                      </div>
                      <ChainChip chain={opp.buyChain} />
                      <Badge variant="outline" className="text-xs">
                        {opp.buyDex}
                      </Badge>
                      <div className="text-sm font-mono">
                        ${opp.buyPrice.toFixed(4)}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        <div className="text-xs text-muted-foreground">
                          {opp.spreadBps.toFixed(1)} bps
                        </div>
                      </div>
                    </div>

                    {/* Sell Side */}
                    <div className="space-y-2 text-right">
                      <div className="text-xs font-medium text-muted-foreground">
                        SELL ON
                      </div>
                      <div className="flex justify-end">
                        <ChainChip chain={opp.sellChain} />
                      </div>
                      <div className="flex justify-end">
                        <Badge variant="outline" className="text-xs">
                          {opp.sellDex}
                        </Badge>
                      </div>
                      <div className="text-sm font-mono">
                        ${opp.sellPrice.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
                    <span>Est. Gas: ${opp.estimatedGasCost.toFixed(2)}</span>
                    <span>
                      {new Date(opp.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
