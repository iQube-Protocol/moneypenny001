import { useState, useEffect } from "react";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, RefreshCw, TrendingUp, Clock, Zap, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { SettlementType, X402Fees } from "@/lib/aigent/moneypenny/modules/x402";

const CHAINS = [
  { id: "eth", name: "Ethereum", color: "hsl(var(--chart-1))" },
  { id: "arb", name: "Arbitrum", color: "hsl(var(--chart-2))" },
  { id: "base", name: "Base", color: "hsl(var(--chart-3))" },
  { id: "op", name: "Optimism", color: "hsl(var(--chart-4))" },
  { id: "poly", name: "Polygon", color: "hsl(var(--chart-5))" },
];

const ASSETS = ["USDC", "USDT", "ETH", "WBTC", "DAI"];

interface FeeEstimate extends X402Fees {
  chain: string;
  settlementType: SettlementType;
}

export function FeeEstimator() {
  const moneyPenny = useMoneyPenny();
  
  const [amount, setAmount] = useState("1000");
  const [asset, setAsset] = useState("USDC");
  const [selectedChain, setSelectedChain] = useState("eth");
  const [settlementType, setSettlementType] = useState<SettlementType>("remote_custody");
  
  const [estimates, setEstimates] = useState<FeeEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        calculateFees();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, amount, asset, settlementType]);

  const calculateFees = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Calculate fees for all chains
      const feePromises = CHAINS.map(async (chain) => {
        try {
          const fees = await moneyPenny.x402.previewFees(
            parseFloat(amount),
            asset,
            settlementType,
            chain.id
          );
          return {
            ...fees,
            chain: chain.id,
            settlementType,
          };
        } catch (error) {
          console.error(`Error calculating fees for ${chain.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(feePromises);
      const validEstimates = results.filter((r): r is FeeEstimate => r !== null);
      
      setEstimates(validEstimates);
      setLastUpdate(new Date());
      
      toast.success("Fee estimates updated");
    } catch (error) {
      console.error("Error calculating fees:", error);
      toast.error("Failed to calculate fees");
    } finally {
      setLoading(false);
    }
  };

  const getBestChain = () => {
    if (estimates.length === 0) return null;
    return estimates.reduce((best, current) => 
      current.total < best.total ? current : best
    );
  };

  const getFastestChain = () => {
    if (estimates.length === 0) return null;
    return estimates.reduce((fastest, current) =>
      current.estimated_time_sec < fastest.estimated_time_sec ? current : fastest
    );
  };

  const currentEstimate = estimates.find(e => e.chain === selectedChain);
  const bestChain = getBestChain();
  const fastestChain = getFastestChain();

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getChainName = (chainId: string) => {
    return CHAINS.find(c => c.id === chainId)?.name || chainId;
  };

  const getSettlementTypeLabel = (type: SettlementType) => {
    switch (type) {
      case "remote_custody":
        return "Remote Custody";
      case "deferred_minting":
        return "Deferred Minting";
      case "canonical_minting":
        return "Canonical Minting";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Fee Estimator
              </CardTitle>
              <CardDescription>
                Preview X402 settlement fees across chains with real-time quotes
              </CardDescription>
            </div>
            {lastUpdate && (
              <div className="text-sm text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Form */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger id="asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement">Settlement Type</Label>
              <Select
                value={settlementType}
                onValueChange={(v) => setSettlementType(v as SettlementType)}
              >
                <SelectTrigger id="settlement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote_custody">Remote Custody</SelectItem>
                  <SelectItem value="deferred_minting">Deferred Minting</SelectItem>
                  <SelectItem value="canonical_minting">Canonical Minting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button
                  onClick={calculateFees}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant={autoRefresh ? "default" : "outline"}
                  size="icon"
                >
                  <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {estimates.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Best Price</p>
                      <p className="text-2xl font-bold">
                        ${bestChain?.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getChainName(bestChain?.chain || "")}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Fastest</p>
                      <p className="text-2xl font-bold">
                        {formatTime(fastestChain?.estimated_time_sec || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getChainName(fastestChain?.chain || "")}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Fee</p>
                      <p className="text-2xl font-bold">
                        ${(estimates.reduce((sum, e) => sum + e.total, 0) / estimates.length).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across {estimates.length} chains
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      {estimates.length > 0 && (
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison">Chain Comparison</TabsTrigger>
            <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Chain Fee Comparison</CardTitle>
                <CardDescription>
                  Compare fees and settlement times across all chains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chain</TableHead>
                      <TableHead>Network Fee</TableHead>
                      <TableHead>Service Fee</TableHead>
                      <TableHead>Total Fee</TableHead>
                      <TableHead>Est. Time</TableHead>
                      <TableHead>Savings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates
                      .sort((a, b) => a.total - b.total)
                      .map((estimate) => {
                        const isBest = estimate.chain === bestChain?.chain;
                        const isFastest = estimate.chain === fastestChain?.chain;
                        const savings = bestChain
                          ? ((estimate.total - bestChain.total) / bestChain.total) * 100
                          : 0;

                        return (
                          <TableRow
                            key={estimate.chain}
                            className={isBest ? "bg-muted/50" : ""}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getChainName(estimate.chain)}
                                {isBest && (
                                  <Badge variant="default" className="text-xs">
                                    Best Price
                                  </Badge>
                                )}
                                {isFastest && (
                                  <Badge variant="secondary" className="text-xs">
                                    Fastest
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              ${estimate.network_fee.toFixed(4)}
                            </TableCell>
                            <TableCell className="font-mono">
                              ${estimate.service_fee.toFixed(4)}
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              ${estimate.total.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(estimate.estimated_time_sec)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isBest ? (
                                <span className="text-green-600 font-medium">—</span>
                              ) : savings > 0 ? (
                                <span className="text-destructive">+{savings.toFixed(1)}%</span>
                              ) : (
                                <span className="text-green-600">{savings.toFixed(1)}%</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {CHAINS.map((chain) => (
                  <Button
                    key={chain.id}
                    variant={selectedChain === chain.id ? "default" : "outline"}
                    onClick={() => setSelectedChain(chain.id)}
                    className="flex-1"
                  >
                    {chain.name}
                  </Button>
                ))}
              </div>

              {currentEstimate && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {getChainName(selectedChain)} Fee Breakdown
                    </CardTitle>
                    <CardDescription>
                      {getSettlementTypeLabel(settlementType)} settlement for {amount} {asset}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Fee Components */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Network Fee</p>
                          <p className="text-sm text-muted-foreground">
                            Gas costs and on-chain execution
                          </p>
                        </div>
                        <p className="text-xl font-bold font-mono">
                          ${currentEstimate.network_fee.toFixed(4)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Service Fee</p>
                          <p className="text-sm text-muted-foreground">
                            X402 protocol and settlement services
                          </p>
                        </div>
                        <p className="text-xl font-bold font-mono">
                          ${currentEstimate.service_fee.toFixed(4)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-primary/10 border-2 border-primary rounded-lg">
                        <div>
                          <p className="font-medium text-lg">Total Fee</p>
                          <p className="text-sm text-muted-foreground">
                            {((currentEstimate.total / parseFloat(amount)) * 100).toFixed(3)}% of transaction
                          </p>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                          ${currentEstimate.total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Settlement Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Estimated Time</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {formatTime(currentEstimate.estimated_time_sec)}
                        </p>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">You Receive</p>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                          {(parseFloat(amount) - currentEstimate.total).toFixed(2)} {asset}
                        </p>
                      </div>
                    </div>

                    {/* Comparison with best */}
                    {bestChain && bestChain.chain !== selectedChain && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">💡 Cost Optimization</p>
                        <p className="text-sm text-muted-foreground">
                          You could save ${(currentEstimate.total - bestChain.total).toFixed(2)} (
                          {(((currentEstimate.total - bestChain.total) / currentEstimate.total) * 100).toFixed(1)}
                          %) by using {getChainName(bestChain.chain)} instead.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {estimates.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Ready to Calculate Fees</p>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your transaction details above and click Calculate to preview fees
              across all supported chains.
            </p>
            <Button onClick={calculateFees}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Fees
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
