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
import { RefreshCw, Plus, Copy, Check, X, ExternalLink } from 'lucide-react';

export function FIOPaymentRequests() {
  const [receivedRequests, setReceivedRequests] = useState<FIORequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FIORequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    toFio: '',
    amount: '',
    asset: 'ETH',
    memo: '',
  });
  const { toast } = useToast();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const moneyPenny = getMoneyPenny();
      const [received, sent] = await Promise.all([
        moneyPenny.fio.listPaymentRequests('received'),
        moneyPenny.fio.listPaymentRequests('sent'),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
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
      await moneyPenny.fio.createPaymentRequest(
        newRequest.toFio,
        parseFloat(newRequest.amount),
        newRequest.asset,
        newRequest.memo
      );
      
      toast({
        title: 'Success',
        description: 'Payment request created successfully',
      });
      
      setCreateDialogOpen(false);
      setNewRequest({ toFio: '', amount: '', asset: 'ETH', memo: '' });
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

  const handleRespond = async (requestId: string, action: 'pay' | 'reject') => {
    try {
      const moneyPenny = getMoneyPenny();
      await moneyPenny.fio.respondToRequest(requestId, action);
      toast({
        title: 'Success',
        description: `Payment request ${action === 'pay' ? 'paid' : 'rejected'}`,
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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleRespond(request.request_id, 'pay')}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Pay
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRespond(request.request_id, 'reject')}
                className="flex-1"
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              Received ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
