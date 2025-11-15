import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { X402RemoteCustody } from '@/lib/aigent/moneypenny/modules/x402';
import { RefreshCw, Plus, Lock, Unlock, DollarSign } from 'lucide-react';

export function X402CustodyDashboard() {
  const [custodyAccounts, setCustodyAccounts] = useState<X402RemoteCustody[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [newCustody, setNewCustody] = useState({
    amount: '',
    asset: 'ETH',
    chain: 'eth',
  });
  const { toast } = useToast();

  const loadCustodyAccounts = async () => {
    setLoading(true);
    try {
      const moneyPenny = getMoneyPenny();
      const accounts = await moneyPenny.x402.listRemoteCustody();
      setCustodyAccounts(accounts);
    } catch (error) {
      console.error('Load custody accounts error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custody accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustodyAccounts();
  }, []);

  const handleOpenCustody = async () => {
    if (!newCustody.amount || !newCustody.asset || !newCustody.chain) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const moneyPenny = getMoneyPenny();
      await moneyPenny.x402.openRemoteCustody(
        parseFloat(newCustody.amount),
        newCustody.asset,
        newCustody.chain
      );
      
      toast({
        title: 'Success',
        description: 'Remote custody escrow opened successfully',
      });
      
      setOpenDialogOpen(false);
      setNewCustody({ amount: '', asset: 'ETH', chain: 'eth' });
      loadCustodyAccounts();
    } catch (error) {
      console.error('Open custody error:', error);
      toast({
        title: 'Error',
        description: 'Failed to open remote custody escrow',
        variant: 'destructive',
      });
    }
  };

  const handleCloseCustody = async (escrowId: string) => {
    try {
      const moneyPenny = getMoneyPenny();
      const result = await moneyPenny.x402.closeRemoteCustody(escrowId);
      
      toast({
        title: 'Success',
        description: result.tx_hash 
          ? `Custody closed: ${result.tx_hash}`
          : 'Custody position closed successfully',
      });
      
      loadCustodyAccounts();
    } catch (error) {
      console.error('Close custody error:', error);
      toast({
        title: 'Error',
        description: 'Failed to close custody position',
        variant: 'destructive',
      });
    }
  };

  const totalBalance = custodyAccounts
    .filter(acc => acc.status === 'open')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const openAccounts = custodyAccounts.filter(acc => acc.status === 'open').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>X402 Remote Custody</CardTitle>
            <CardDescription>
              Manage escrow accounts with multi-chain support
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCustodyAccounts}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Open Escrow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Open Remote Custody</DialogTitle>
                  <DialogDescription>
                    Create a new escrow account for secure custody
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      placeholder="0.0"
                      value={newCustody.amount}
                      onChange={(e) =>
                        setNewCustody({ ...newCustody, amount: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset">Asset</Label>
                    <Input
                      id="asset"
                      placeholder="ETH"
                      value={newCustody.asset}
                      onChange={(e) =>
                        setNewCustody({ ...newCustody, asset: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="chain">Chain</Label>
                    <Select
                      value={newCustody.chain}
                      onValueChange={(value) =>
                        setNewCustody({ ...newCustody, chain: value })
                      }
                    >
                      <SelectTrigger id="chain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eth">Ethereum</SelectItem>
                        <SelectItem value="arb">Arbitrum</SelectItem>
                        <SelectItem value="base">Base</SelectItem>
                        <SelectItem value="op">Optimism</SelectItem>
                        <SelectItem value="poly">Polygon</SelectItem>
                        <SelectItem value="btc">Bitcoin</SelectItem>
                        <SelectItem value="sol">Solana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleOpenCustody} className="w-full">
                    Open Custody Escrow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Accounts</p>
                  <p className="text-2xl font-bold">{openAccounts}</p>
                </div>
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Custody Accounts List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Escrow Accounts</h3>
          {custodyAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No custody accounts yet</p>
              <p className="text-sm">Open your first escrow to get started</p>
            </div>
          ) : (
            custodyAccounts.map((account) => (
              <Card key={account.escrow_id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={account.status === 'open' ? 'default' : 'secondary'}
                        >
                          {account.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {account.escrow_id.slice(0, 8)}...
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="text-lg font-semibold">
                            {account.balance} {account.asset}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Chain</p>
                          <p className="text-lg font-semibold uppercase">
                            {account.chain}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Opened: {new Date(account.opened_at).toLocaleString()}
                      </div>
                    </div>

                    {account.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloseCustody(account.escrow_id)}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        Close
                      </Button>
                    )}
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
