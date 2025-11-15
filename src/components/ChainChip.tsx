import { Badge } from "@/components/ui/badge";
import { Bitcoin, CircleDollarSign, Coins } from "lucide-react";

interface ChainChipProps {
  chain: string;
  active?: boolean;
  onClick?: () => void;
}

const chainConfig: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  eth: { label: "ETH", color: "bg-[#627eea]" },
  arb: { label: "ARB", color: "bg-[#2d374b]" },
  base: { label: "BASE", color: "bg-[#0052ff]" },
  op: { label: "OP", color: "bg-[#ff0420]" },
  poly: { label: "POLY", color: "bg-[#8247e5]" },
  btc: { label: "BTC", color: "bg-[#f7931a]", icon: <Bitcoin className="h-3 w-3" /> },
  sol: { label: "SOL", color: "bg-[#14f195]", icon: <Coins className="h-3 w-3" /> },
};

export function ChainChip({ chain, active, onClick }: ChainChipProps) {
  const config = chainConfig[chain.toLowerCase()] || { label: chain.toUpperCase(), color: "bg-muted" };
  
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={`cursor-pointer transition-all ${
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
          : "hover:bg-card/80 hover:border-primary/40"
      }`}
      onClick={onClick}
    >
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
