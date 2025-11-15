import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChainChip } from "./ChainChip";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Intent } from "@/lib/aigent/moneypenny/modules/execution";

interface IntentFormProps {
  availableChains: string[];
}

export function IntentForm({ availableChains }: IntentFormProps) {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();

  const [selectedChain, setSelectedChain] = useState<string>(availableChains[0] || "eth");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amountQc, setAmountQc] = useState<string>("100");
  const [minEdgeBps, setMinEdgeBps] = useState<string>("1.0");
  const [maxSlippageBps, setMaxSlippageBps] = useState<string>("5.0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const amount = parseFloat(amountQc);
    const minEdge = parseFloat(minEdgeBps);
    const maxSlippage = parseFloat(maxSlippageBps);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(minEdge) || minEdge < 0) {
      toast({
        title: "Invalid min edge",
        description: "Please enter a valid minimum edge",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(maxSlippage) || maxSlippage < 0) {
      toast({
        title: "Invalid max slippage",
        description: "Please enter a valid maximum slippage",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting intent:', { selectedChain, side, amount, minEdge, maxSlippage });
      
      const intent = await moneyPenny.execution.submitIntent(
        selectedChain,
        side,
        amount,
        minEdge,
        maxSlippage
      );

      setCurrentIntent(intent);
      
      toast({
        title: "Intent submitted",
        description: `Intent ${intent.intent_id} submitted successfully`,
      });

      // Start polling for intent status
      pollIntentStatus(intent.intent_id);
    } catch (error) {
      console.error('Failed to submit intent:', error);
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
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Failed to cancel intent",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Intent['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning';
      case 'quoted': return 'bg-primary/20 text-primary';
      case 'executing': return 'bg-primary/20 text-primary';
      case 'filled': return 'bg-success/20 text-success';
      case 'cancelled': return 'bg-muted/20 text-muted-foreground';
      case 'failed': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Intent['status']) => {
    switch (status) {
      case 'filled': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Submit Trading Intent</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chain Selector */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Select Chain</Label>
          <div className="flex flex-wrap gap-2">
            {availableChains.map((chain) => (
              <button
                key={chain}
                type="button"
                onClick={() => setSelectedChain(chain)}
                className={`transition-all ${
                  selectedChain === chain ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-75'
                }`}
              >
                <ChainChip chain={chain} />
              </button>
            ))}
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Side</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={side === "BUY" ? "default" : "outline"}
              onClick={() => setSide("BUY")}
              className="flex-1 gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Buy
            </Button>
            <Button
              type="button"
              variant={side === "SELL" ? "default" : "outline"}
              onClick={() => setSide("SELL")}
              className="flex-1 gap-2"
            >
              <TrendingDown className="h-4 w-4" />
              Sell
            </Button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Label htmlFor="amount" className="text-sm font-medium mb-2 block">
            Amount (Q¢)
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amountQc}
            onChange={(e) => setAmountQc(e.target.value)}
            placeholder="100"
            className="font-mono"
          />
        </div>

        {/* Min Edge */}
        <div>
          <Label htmlFor="minEdge" className="text-sm font-medium mb-2 block">
            Min Edge (bps)
          </Label>
          <Input
            id="minEdge"
            type="number"
            step="0.1"
            value={minEdgeBps}
            onChange={(e) => setMinEdgeBps(e.target.value)}
            placeholder="1.0"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum edge in basis points required for execution
          </p>
        </div>

        {/* Max Slippage */}
        <div>
          <Label htmlFor="maxSlippage" className="text-sm font-medium mb-2 block">
            Max Slippage (bps)
          </Label>
          <Input
            id="maxSlippage"
            type="number"
            step="0.1"
            value={maxSlippageBps}
            onChange={(e) => setMaxSlippageBps(e.target.value)}
            placeholder="5.0"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum acceptable slippage in basis points
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !selectedChain}
          className="w-full gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Intent...
            </>
          ) : (
            <>Submit Intent</>
          )}
        </Button>
      </form>

      {/* Current Intent Status */}
      {currentIntent && (
        <div className="mt-6 pt-6 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Current Intent</h4>
            <Badge className={getStatusColor(currentIntent.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(currentIntent.status)}
                {currentIntent.status}
              </span>
            </Badge>
          </div>

          <div className="glass-card p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Intent ID:</span>
              <code className="text-xs font-mono">{currentIntent.intent_id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chain:</span>
              <ChainChip chain={currentIntent.chain} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Side:</span>
              <span className={currentIntent.side === 'BUY' ? 'text-success' : 'text-destructive'}>
                {currentIntent.side}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono">{currentIntent.amount_qc} Q¢</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Edge:</span>
              <span className="font-mono">{currentIntent.min_edge_bps} bps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Slippage:</span>
              <span className="font-mono">{currentIntent.max_slippage_bps} bps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="text-xs">{new Date(currentIntent.created_at).toLocaleString()}</span>
            </div>
          </div>

          {(currentIntent.status === 'pending' || currentIntent.status === 'quoted') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              className="w-full"
            >
              Cancel Intent
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
