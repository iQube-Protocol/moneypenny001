import { useWallet } from '@/hooks/use-wallet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wallet, CheckCircle2 } from 'lucide-react';

export function WalletStatus() {
  const { isConnected, address, walletKind } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Badge variant="outline" className="gap-2 px-3 py-1.5">
        <Wallet className="h-3 w-3" />
        <span className="text-xs">Not Connected</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-2 px-3 py-1.5">
      <CheckCircle2 className="h-3 w-3 text-green-600" />
      <span className="text-xs capitalize">{walletKind}</span>
      <Separator orientation="vertical" className="h-3" />
      <code className="text-xs">{formatAddress(address!)}</code>
    </Badge>
  );
}

