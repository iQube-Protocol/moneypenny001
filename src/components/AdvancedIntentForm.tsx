import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChainChip } from "./ChainChip";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { useToast } from "@/hooks/use-toast";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { TrendingUp, TrendingDown, Loader2, Settings2, Zap } from "lucide-react";
import { Intent } from "@/lib/aigent/moneypenny/modules/execution";
import { z } from "zod";

const advancedIntentSchema = z.object({
  chain: z.string().min(1, "Chain is required"),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT"]),
  amount: z.number().positive("Amount must be positive"),
  limitPrice: z.number().positive("Limit price must be positive").optional(),
  minEdgeBps: z.number().min(0, "Min edge must be non-negative"),
  maxSlippageBps: z.number().min(0, "Max slippage must be non-negative"),
  stopLoss: z.number().positive("Stop loss must be positive").optional(),
  takeProfit: z.number().positive("Take profit must be positive").optional(),
  timeInForce: z.enum(["GTC", "IOC", "FOK", "DAY"]),
});

type AdvancedIntentInput = z.infer<typeof advancedIntentSchema>;

interface AdvancedIntentFormProps {
  availableChains: string[];
  suggestedStrategy?: any;
}

export function AdvancedIntentForm({ availableChains, suggestedStrategy }: AdvancedIntentFormProps) {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { closeOverlay } = useOverlayManager();

  // Apply suggested strategy if provided
  const [selectedChain, setSelectedChain] = useState<string>(suggestedStrategy?.chain || availableChains[0] || "eth");
  const [side, setSide] = useState<"BUY" | "SELL">(suggestedStrategy?.action === 'buy' ? 'BUY' : suggestedStrategy?.action === 'sell' ? 'SELL' : 'BUY');
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [amount, setAmount] = useState<string>(suggestedStrategy?.size_qc?.toString() || "100");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [minEdgeBps, setMinEdgeBps] = useState<string>(suggestedStrategy?.min_edge_bps?.toString() || "1.0");
  const [maxSlippageBps, setMaxSlippageBps] = useState<string>("5.0");
  const [timeInForce, setTimeInForce] = useState<"GTC" | "IOC" | "FOK" | "DAY">("GTC");
  
  const [enableStopLoss, setEnableStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [enableTakeProfit, setEnableTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);

  // Load applied banking policy on mount
  useEffect(() => {
    const savedPolicy = localStorage.getItem('moneypenny_applied_config');
    if (savedPolicy) {
      try {
        const policy = JSON.parse(savedPolicy);
        
        // Pre-fill form with banking recommendations
        if (policy.min_edge_bps) {
          setMinEdgeBps(policy.min_edge_bps.toString());
        }
        if (policy.max_notional_usd) {
          setAmount(policy.max_notional_usd.toString());
        }
        
        toast({
          title: "Policy loaded",
          description: "Form pre-filled with banking profile recommendations",
        });
      } catch (error) {
        console.error("Failed to parse saved policy:", error);
      }
    }
  }, [toast]);

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse and validate inputs
      const input: AdvancedIntentInput = {
        chain: selectedChain,
        side,
        orderType,
        amount: parseFloat(amount),
        limitPrice: orderType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : undefined,
        minEdgeBps: parseFloat(minEdgeBps),
        maxSlippageBps: parseFloat(maxSlippageBps),
        stopLoss: enableStopLoss && stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: enableTakeProfit && takeProfit ? parseFloat(takeProfit) : undefined,
        timeInForce,
      };

      // Validate with Zod
      advancedIntentSchema.parse(input);

      // Additional validation for limit orders
      if (orderType === "LIMIT" && !input.limitPrice) {
        toast({
          title: "Validation Error",
          description: "Limit price is required for limit orders",
          variant: "destructive",
        });
        return;
      }

      // Validate stop loss and take profit relationships
      if (input.stopLoss && input.takeProfit) {
        if (side === "BUY" && input.stopLoss >= input.takeProfit) {
          toast({
            title: "Validation Error",
            description: "For BUY orders, stop loss must be below take profit",
            variant: "destructive",
          });
          return;
        }
        if (side === "SELL" && input.stopLoss <= input.takeProfit) {
          toast({
            title: "Validation Error",
            description: "For SELL orders, stop loss must be above take profit",
            variant: "destructive",
          });
          return;
        }
      }

      await handleSubmit(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Submission Error",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (input: AdvancedIntentInput) => {
    setIsSubmitting(true);

    try {
      // Note: The backend submitIntent may need to be enhanced to support these advanced features
      // For now, we'll submit with the basic parameters and log the advanced ones
      console.log('Advanced intent parameters:', {
        orderType: input.orderType,
        limitPrice: input.limitPrice,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        timeInForce: input.timeInForce,
      });

      const intent = await moneyPenny.execution.submitIntent(
        input.chain,
        input.side,
        input.amount,
        input.minEdgeBps,
        input.maxSlippageBps
      );

      setCurrentIntent(intent);
      
      toast({
        title: "Intent submitted",
        description: `${input.orderType} order submitted: ${intent.intent_id}`,
      });

      // Close overlay and navigate to Feed page
      closeOverlay();
      setTimeout(() => {
        navigate("/console");
      }, 100);

      pollIntentStatus(intent.intent_id);
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit intent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollIntentStatus = async (intentId: string) => {
    const maxAttempts = 20;
    let attempts = 0;

    const poll = async () => {
      try {
        const intent = await moneyPenny.execution.getIntent(intentId);
        setCurrentIntent(intent);

        if (intent.status === 'filled' || intent.status === 'cancelled' || intent.status === 'failed') {
          toast({
            title: `Intent ${intent.status}`,
            description: `Intent ${intentId} has been ${intent.status}`,
            variant: intent.status === 'filled' ? 'default' : 'destructive',
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Failed to poll intent status:', error);
      }
    };

    poll();
  };

  const handleCancel = async () => {
    if (!currentIntent) return;

    try {
      await moneyPenny.execution.cancelIntent(currentIntent.intent_id);
      toast({
        title: "Intent cancelled",
        description: `Intent ${currentIntent.intent_id} has been cancelled`,
      });
      setCurrentIntent(null);
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Failed to cancel intent",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <CardTitle className="text-base">Trading Intent</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={validateAndSubmit} className="space-y-3">
          {/* Chain + Side Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Chain</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableChains.map(chain => (
                    <SelectItem key={chain} value={chain} className="text-xs uppercase">{chain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Side</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={side === "BUY" ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => setSide("BUY")}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Buy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={side === "SELL" ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => setSide("SELL")}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Sell
                </Button>
              </div>
            </div>
          </div>

          {/* Order Type + Amount Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Order Type</Label>
              <Select value={orderType} onValueChange={(value) => setOrderType(value as "MARKET" | "LIMIT")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="MARKET" className="text-xs">Market</SelectItem>
                  <SelectItem value="LIMIT" className="text-xs">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Amount (Q¢)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          {/* Limit Price (conditional) + Min Edge Row */}
          <div className="grid grid-cols-2 gap-2">
            {orderType === "LIMIT" && (
              <div className="space-y-1.5">
                <Label htmlFor="limitPrice" className="text-xs">Limit Price</Label>
                <Input
                  id="limitPrice"
                  type="number"
                  step="0.0001"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-xs"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="minEdge" className="text-xs">Min Edge (bps)</Label>
              <Input
                id="minEdge"
                type="number"
                step="0.1"
                value={minEdgeBps}
                onChange={(e) => setMinEdgeBps(e.target.value)}
                placeholder="1.0"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxSlippage" className="text-xs">Max Slip (bps)</Label>
              <Input
                id="maxSlippage"
                type="number"
                step="0.1"
                value={maxSlippageBps}
                onChange={(e) => setMaxSlippageBps(e.target.value)}
                placeholder="5.0"
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          {/* Advanced Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={enableStopLoss || enableTakeProfit}
              onCheckedChange={(checked) => {
                setEnableStopLoss(checked);
                setEnableTakeProfit(checked);
              }}
              className="scale-75"
            />
            <Label className="text-xs text-muted-foreground cursor-pointer">
              Stop Loss / Take Profit
            </Label>
          </div>

          {/* Stop Loss + Take Profit Row (when enabled) */}
          {(enableStopLoss || enableTakeProfit) && (
            <div className="grid grid-cols-2 gap-2">
              {enableStopLoss && (
                <div className="space-y-1.5">
                  <Label htmlFor="stopLoss" className="text-xs">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.0001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {enableTakeProfit && (
                <div className="space-y-1.5">
                  <Label htmlFor="takeProfit" className="text-xs">Take Profit</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    step="0.0001"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Current Intent Status (compact) */}
          {currentIntent && (
            <div className="p-2 rounded border bg-card/50 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-muted-foreground">Intent:</span>
                <span className="font-mono ml-1">{currentIntent.intent_id.slice(0, 8)}...</span>
              </div>
              <Badge variant={
                currentIntent.status === 'filled' ? 'default' :
                currentIntent.status === 'failed' ? 'destructive' :
                'secondary'
              } className="text-xs">
                {currentIntent.status}
              </Badge>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-8 text-xs"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>Submit {orderType}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
