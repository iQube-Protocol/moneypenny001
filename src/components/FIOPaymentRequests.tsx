import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { FIORequest } from '@/lib/aigent/moneypenny/modules/fio';
import { X402Claim, SettlementType } from '@/lib/aigent/moneypenny/modules/x402';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Copy, Check, X, ExternalLink } from 'lucide-react';

export function FIOPaymentRequests() {
  const [receivedRequests, setReceivedRequests] = useState<FIORequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FIORequest[]>([]);
  const [x402Claims, setX402Claims] = useState<X402Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    toFio: '',
    amount: '',
    asset: 'ETH',
    chain: 'eth',
    memo: '',
    useX402: false,
    settlementType: 'remote_custody' as SettlementType,
  });
  const { toast } = useToast();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const moneyPenny = getMoneyPenny();
      const [received, sent, claims] = await Promise.all([
        moneyPenny.fio.listPaymentRequests('received'),
        moneyPenny.fio.listPaymentRequests('sent'),
        moneyPenny.x402.listClaims(),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
      setX402Claims(claims);
    } catch (error) {
      console.error('Load requests error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!newRequest.toFio || !newRequest.amount || !newRequest.asset) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const moneyPenny = getMoneyPenny();
      
      // If X402 is enabled, create X402 claim first
      if (newRequest.useX402) {
        const claim = await moneyPenny.x402.createClaim(
          parseFloat(newRequest.amount),
          newRequest.asset,
          newRequest.settlementType,
          newRequest.chain
        );
        
        toast({
          title: 'X402 Claim Created',
          description: `Claim ${claim.claim_id} created with ${newRequest.settlementType}`,
        });
      }
      
      // Create FIO payment request
      await moneyPenny.fio.createPaymentRequest(
        newRequest.toFio,
        parseFloat(newRequest.amount),
        newRequest.asset,
        newRequest.memo
      );
      
      toast({
        title: 'Success',
        description: newRequest.useX402 
          ? 'Payment request created with X402 settlement'
          : 'Payment request created successfully',
      });
      
      setCreateDialogOpen(false);
      setNewRequest({ 
        toFio: '', 
        amount: '', 
        asset: 'ETH', 
        chain: 'eth',
        memo: '',
        useX402: false,
        settlementType: 'remote_custody',
      });
      loadRequests();
    } catch (error) {
      console.error('Create request error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payment request',
        variant: 'destructive',
      });
    }
  };

  const handleRespond = async (requestId: string, action: 'pay' | 'reject', useX402?: boolean) => {
    try {
      const moneyPenny = getMoneyPenny();
      
      if (action === 'pay' && useX402) {
        // Use X402 for payment
        const request = receivedRequests.find(r => r.request_id === requestId);
        if (request) {
          await moneyPenny.x402.createClaim(
            request.amount,
            request.asset,
            'canonical_minting'
          );
        }
      }
      
      await moneyPenny.fio.respondToRequest(requestId, action);
      toast({
        title: 'Success',
        description: `Payment request ${action === 'pay' ? 'paid' : 'rejected'}${useX402 ? ' via X402' : ''}`,
      });
      loadRequests();
    } catch (error) {
      console.error('Respond error:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action} payment request`,
        variant: 'destructive',
      });
    }
  };

  const handleSettleClaim = async (claimId: string) => {
    try {
      const moneyPenny = getMoneyPenny();
      const result = await moneyPenny.x402.settleClaim(claimId);
      toast({
        title: 'Success',
        description: result.tx_hash ? `Claim settled: ${result.tx_hash}` : 'Claim settled',
      });
      loadRequests();
    } catch (error) {
      console.error('Settle claim error:', error);
      toast({
        title: 'Error',
        description: 'Failed to settle claim',
        variant: 'destructive',
      });
    }
  };

  const generateDeepLink = (request: FIORequest) => {
    return `fio://request?from=${request.from_fio}&to=${request.to_fio}&amount=${request.amount}&asset=${request.asset}&id=${request.request_id}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const RequestCard = ({ request, type }: { request: FIORequest; type: 'received' | 'sent' }) => {
    const deepLink = generateDeepLink(request);
    const [showQR, setShowQR] = useState(false);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">
                {type === 'received' ? 'From' : 'To'}: {type === 'received' ? request.from_fio : request.to_fio}
              </CardTitle>
              <CardDescription>
                {request.amount} {request.asset}
              </CardDescription>
            </div>
            <Badge
              variant={
                request.status === 'paid'
                  ? 'default'
                  : request.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.memo && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Memo:</span> {request.memo}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Created: {new Date(request.created_at).toLocaleString()}
          </div>

          {type === 'received' && request.status === 'pending' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRespond(request.request_id, 'pay', false)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Pay Direct
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond(request.request_id, 'pay', true)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Pay X402
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRespond(request.request_id, 'reject')}
                className="w-full"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}

          {type === 'sent' && (
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQR(!showQR)}
                className="w-full"
              >
                {showQR ? 'Hide' : 'Show'} QR Code
              </Button>

              {showQR && (
                <div className="flex flex-col items-center p-4 bg-background border rounded-lg">
                  <QRCodeSVG value={deepLink} size={200} level="H" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Scan to pay with FIO
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(deepLink, 'Deep link')}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(deepLink, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>FIO Payment Requests</CardTitle>
            <CardDescription>Request and receive crypto payments</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payment Request</DialogTitle>
                  <DialogDescription>
                    Request payment from another FIO address
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="toFio">To FIO Address</Label>
                    <Input
                      id="toFio"
                      placeholder="user@aigent"
                      value={newRequest.toFio}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, toFio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      placeholder="0.0"
                      value={newRequest.amount}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, amount: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset">Asset</Label>
                    <Input
                      id="asset"
                      placeholder="ETH"
                      value={newRequest.asset}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, asset: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="chain">Chain</Label>
                    <Select
                      value={newRequest.chain}
                      onValueChange={(value) =>
                        setNewRequest({ ...newRequest, chain: value })
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
                  <div>
                    <Label htmlFor="memo">Memo (optional)</Label>
                    <Textarea
                      id="memo"
                      placeholder="Payment for..."
                      value={newRequest.memo}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, memo: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                    <input
                      type="checkbox"
                      id="useX402"
                      checked={newRequest.useX402}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, useX402: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useX402" className="cursor-pointer">
                      Use X402 Settlement (DiDQube Persona)
                    </Label>
                  </div>
                  {newRequest.useX402 && (
                    <div>
                      <Label htmlFor="settlementType">Settlement Type</Label>
                      <Select
                        value={newRequest.settlementType}
                        onValueChange={(value: SettlementType) =>
                          setNewRequest({ ...newRequest, settlementType: value })
                        }
                      >
                        <SelectTrigger id="settlementType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote_custody">
                            Remote Custody (Escrow)
                          </SelectItem>
                          <SelectItem value="deferred_minting">
                            Deferred Minting
                          </SelectItem>
                          <SelectItem value="canonical_minting">
                            Canonical Minting
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newRequest.settlementType === 'remote_custody' &&
                          'Funds held in escrow until settlement'}
                        {newRequest.settlementType === 'deferred_minting' &&
                          'Mint tokens upon payment confirmation'}
                        {newRequest.settlementType === 'canonical_minting' &&
                          'Direct on-chain minting with verification'}
                      </p>
                    </div>
                  )}
                  <Button onClick={handleCreateRequest} className="w-full">
                    Create Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="received">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="received">
              Received ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
            <TabsTrigger value="x402">X402 ({x402Claims.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No received payment requests
              </div>
            ) : (
              receivedRequests.map((request) => (
                <RequestCard
                  key={request.request_id}
                  request={request}
                  type="received"
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="sent" className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sent payment requests
              </div>
            ) : (
              sentRequests.map((request) => (
                <RequestCard
                  key={request.request_id}
                  request={request}
                  type="sent"
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="x402" className="space-y-4">
            {x402Claims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No X402 claims
              </div>
            ) : (
              x402Claims.map((claim) => (
                <Card key={claim.claim_id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium">
                          Claim {claim.claim_id.slice(0, 8)}...
                        </CardTitle>
                        <CardDescription>
                          {claim.amount} {claim.asset} {claim.chain && `on ${claim.chain}`}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          claim.status === 'settled'
                            ? 'default'
                            : claim.status === 'expired'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {claim.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Settlement:</span>
                        <span className="font-medium">{claim.settlement_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(claim.created_at).toLocaleString()}</span>
                      </div>
                      {claim.expires_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{new Date(claim.expires_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    {claim.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleSettleClaim(claim.claim_id)}
                        className="w-full mt-2"
                      >
                        Settle Claim
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
