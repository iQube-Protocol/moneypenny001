import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Wallet, Copy, ExternalLink } from "lucide-react";
import { ChainChip } from "./ChainChip";
import { useToast } from "@/hooks/use-toast";

interface WalletBalance {
  chain: string;
  balance: string;
  usdValue: number;
}

export function WalletDrawer() {
  const [isConnected, setIsConnected] = useState(false);
  const [address] = useState("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
  const { toast } = useToast();

  const balances: WalletBalance[] = [
    { chain: "eth", balance: "1.234", usdValue: 2847.32 },
    { chain: "arb", balance: "0.567", usdValue: 1308.45 },
    { chain: "base", balance: "2.890", usdValue: 6672.11 },
  ];

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant={isConnected ? "outline" : "default"}
          size="sm"
          className="gap-2"
        >
          <Wallet className="h-4 w-4" />
          {isConnected ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="glass-card border-t border-border">
        <DrawerHeader>
          <DrawerTitle>Wallet</DrawerTitle>
          <DrawerDescription>
            {isConnected ? "Manage your wallet and view balances" : "Connect your MetaMask wallet to get started"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {!isConnected ? (
            <div className="text-center py-8">
              <Button onClick={() => setIsConnected(true)} size="lg" className="gap-2">
                <Wallet className="h-5 w-5" />
                Connect MetaMask
              </Button>
            </div>
          ) : (
            <>
              <div className="glass-card p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Connected Address</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono">{address}</code>
                  <Button size="icon" variant="ghost" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Balances</h4>
                {balances.map((balance) => (
                  <div key={balance.chain} className="glass-card p-4 glass-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChainChip chain={balance.chain} />
                        <div>
                          <div className="font-mono text-sm">{balance.balance}</div>
                          <div className="text-xs text-muted-foreground">
                            ${balance.usdValue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
