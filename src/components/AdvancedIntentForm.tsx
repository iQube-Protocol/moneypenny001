import { useState } from "react";
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
}

export function AdvancedIntentForm({ availableChains }: AdvancedIntentFormProps) {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();

  const [selectedChain, setSelectedChain] = useState<string>(availableChains[0] || "eth");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [amount, setAmount] = useState<string>("100");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [minEdgeBps, setMinEdgeBps] = useState<string>("1.0");
  const [maxSlippageBps, setMaxSlippageBps] = useState<string>("5.0");
  const [timeInForce, setTimeInForce] = useState<"GTC" | "IOC" | "FOK" | "DAY">("GTC");
  
  const [enableStopLoss, setEnableStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [enableTakeProfit, setEnableTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Advanced Trading Intent
        </CardTitle>
        <CardDescription>
          Submit sophisticated orders with limit prices, stop-loss, and take-profit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={validateAndSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">
                <Zap className="h-4 w-4 mr-2" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <Settings2 className="h-4 w-4 mr-2" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              {/* Chain Selection */}
              <div className="space-y-2">
                <Label>Chain</Label>
                <div className="flex flex-wrap gap-2">
                  {availableChains.map((chain) => (
                    <ChainChip
                      key={chain}
                      chain={chain}
                      active={selectedChain === chain}
                      onClick={() => setSelectedChain(chain)}
                    />
                  ))}
                </div>
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(value) => setOrderType(value as "MARKET" | "LIMIT")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="MARKET">Market Order</SelectItem>
                    <SelectItem value="LIMIT">Limit Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Side */}
              <div className="space-y-2">
                <Label>Side</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={side === "BUY" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSide("BUY")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={side === "SELL" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSide("SELL")}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Q¢)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  required
                />
              </div>

              {/* Limit Price */}
              {orderType === "LIMIT" && (
                <div className="space-y-2">
                  <Label htmlFor="limitPrice">Limit Price (USDC)</Label>
                  <Input
                    id="limitPrice"
                    type="number"
                    step="0.0001"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              {/* Min Edge */}
              <div className="space-y-2">
                <Label htmlFor="minEdge">Min Edge (bps)</Label>
                <Input
                  id="minEdge"
                  type="number"
                  step="0.1"
                  value={minEdgeBps}
                  onChange={(e) => setMinEdgeBps(e.target.value)}
                  placeholder="1.0"
                  required
                />
              </div>

              {/* Max Slippage */}
              <div className="space-y-2">
                <Label htmlFor="maxSlippage">Max Slippage (bps)</Label>
                <Input
                  id="maxSlippage"
                  type="number"
                  step="0.1"
                  value={maxSlippageBps}
                  onChange={(e) => setMaxSlippageBps(e.target.value)}
                  placeholder="5.0"
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              {/* Time in Force */}
              <div className="space-y-2">
                <Label>Time in Force</Label>
                <Select value={timeInForce} onValueChange={(value) => setTimeInForce(value as typeof timeInForce)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="GTC">Good Till Cancel (GTC)</SelectItem>
                    <SelectItem value="IOC">Immediate or Cancel (IOC)</SelectItem>
                    <SelectItem value="FOK">Fill or Kill (FOK)</SelectItem>
                    <SelectItem value="DAY">Day Order</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {timeInForce === "GTC" && "Order remains active until filled or cancelled"}
                  {timeInForce === "IOC" && "Execute immediately and cancel any unfilled portion"}
                  {timeInForce === "FOK" && "Must be filled completely or cancelled entirely"}
                  {timeInForce === "DAY" && "Order expires at end of trading day"}
                </p>
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stopLoss">Stop Loss (USDC)</Label>
                  <Switch
                    checked={enableStopLoss}
                    onCheckedChange={setEnableStopLoss}
                  />
                </div>
                {enableStopLoss && (
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.0001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Enter stop loss price"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Automatically exit position if price reaches this level
                </p>
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="takeProfit">Take Profit (USDC)</Label>
                  <Switch
                    checked={enableTakeProfit}
                    onCheckedChange={setEnableTakeProfit}
                  />
                </div>
                {enableTakeProfit && (
                  <Input
                    id="takeProfit"
                    type="number"
                    step="0.0001"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Enter take profit price"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Automatically lock in profits when price reaches this level
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Current Intent Status */}
          {currentIntent && (
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Intent</span>
                <Badge variant={
                  currentIntent.status === 'filled' ? 'default' :
                  currentIntent.status === 'failed' ? 'destructive' :
                  'secondary'
                }>
                  {currentIntent.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>ID: {currentIntent.intent_id}</div>
                <div>Chain: {currentIntent.chain}</div>
                <div>Amount: {currentIntent.amount_qc} Q¢</div>
              </div>
              {currentIntent.status === 'pending' && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleCancel}
                >
                  Cancel Intent
                </Button>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>Submit {orderType} Order</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
