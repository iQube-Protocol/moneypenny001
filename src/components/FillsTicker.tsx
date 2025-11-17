import { Card } from "@/components/ui/card";
import { ChainChip } from "./ChainChip";
import { TrendingUp, TrendingDown } from "lucide-react";
interface Fill {
  side: "BUY" | "SELL";
  chain: string;
  qty: number;
  price: number;
  captureBps: number;
  timestamp: string;
}
interface FillsTickerProps {
  fills: Fill[];
}
export function FillsTicker({
  fills
}: FillsTickerProps) {
  return;
}