import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Search, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

const SUPPORTED_CHAINS = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'sol', name: 'Solana', symbol: 'SOL' },
  { id: 'arb', name: 'Arbitrum', symbol: 'ARB' },
  { id: 'base', name: 'Base', symbol: 'BASE' },
  { id: 'op', name: 'Optimism', symbol: 'OP' },
  { id: 'poly', name: 'Polygon', symbol: 'POLY' },
];

interface WalletAddress {
  chain: string;
  address: string;
  verified: boolean;
}

export const FIOManager = () => {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  
  const [myHandle, setMyHandle] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedHandle, setSearchedHandle] = useState<any>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add address dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    chain: '',
    address: '',
  });

  useEffect(() => {
    loadMyHandle();
  }, []);

  const loadMyHandle = async () => {
    setIsLoading(true);
    try {
      const handle = await moneyPenny.fio.getMyHandle();
      if (handle) {
        setMyHandle(handle);
        setAddresses(handle.wallet_addresses || []);
      }
    } catch (error) {
      console.error('Failed to load FIO handle:', error);
      toast({
        title: "No FIO handle found",
        description: "You don't have a FIO handle registered yet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await moneyPenny.fio.resolveHandle(searchQuery);
      
      if (result && result.wallet_addresses) {
        toast({
          title: "Handle found",
          description: `Found ${result.wallet_addresses.length} address mappings`,
        });
        setSearchedHandle(result);
      } else {
        toast({
          title: "No addresses found",
          description: "This FIO handle has no address mappings",
        });
        setSearchedHandle(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to resolve FIO address",
        variant: "destructive",
      });
      setSearchedHandle(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!myHandle || !newAddress.chain || !newAddress.address) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await moneyPenny.fio.linkWallet(newAddress.chain, newAddress.address);

      toast({
        title: "Address added",
        description: `Successfully linked ${newAddress.chain.toUpperCase()} address`,
      });

      // Reset form and reload
      setNewAddress({ chain: '', address: '' });
      setIsAddDialogOpen(false);
      loadMyHandle();
    } catch (error) {
      console.error('Failed to add address:', error);
      toast({
        title: "Failed to add address",
        description: error instanceof Error ? error.message : "Could not link address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const displayAddresses = searchedHandle 
    ? searchedHandle.wallet_addresses 
    : addresses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            FIO Handle Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage crypto addresses across all chains with FIO protocol
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Chain Address</DialogTitle>
              <DialogDescription>
                Map a blockchain address to your FIO handle
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {myHandle && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Your FIO Handle</Label>
                  <p className="font-mono mt-1">{myHandle.fio_address}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Chain</Label>
                <Select 
                  value={newAddress.chain} 
                  onValueChange={(value) => setNewAddress(prev => ({ 
                    ...prev, 
                    chain: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id}>
                        {chain.name} ({chain.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="0x... or wallet address"
                  value={newAddress.address}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAddress} disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Address"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Tabs defaultValue="handles" className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-4">
            <TabsTrigger value="handles">My Handles</TabsTrigger>
            <TabsTrigger value="search">Search Handles</TabsTrigger>
          </TabsList>

          <TabsContent value="handles" className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={loadMyHandle} variant="outline" disabled={isLoading} className="flex-1">
                  {isLoading ? "Loading..." : "Refresh Handle"}
                </Button>
              </div>

              {myHandle && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-mono text-sm">{myHandle.fio_address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {addresses.length} address{addresses.length !== 1 ? 'es' : ''} linked
                      </p>
                      {myHandle.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(myHandle.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading addresses...
                        </div>
                      ) : addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No addresses mapped yet</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setIsAddDialogOpen(true)}
                          >
                            Add your first address
                          </Button>
                        </div>
                      ) : (
                        addresses.map((addr, idx) => (
                          <Card key={idx} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {addr.chain.toUpperCase()}
                                  </Badge>
                                  {addr.verified && (
                                    <Badge variant="secondary">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-mono text-sm break-all">
                                  {addr.address}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => copyToClipboard(addr.address)}
                                className="ml-2"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))
                       )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search FIO handle (e.g., user@domain)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {!searchedHandle ? (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Search for a FIO handle to view their addresses
                      </p>
                    </div>
                  ) : searchedHandle.wallet_addresses?.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No addresses found for this handle
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-muted rounded-lg mb-4">
                        <p className="font-mono text-sm">{searchedHandle.fio_address}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchedHandle.wallet_addresses.length} address{searchedHandle.wallet_addresses.length !== 1 ? 'es' : ''} found
                        </p>
                      </div>
                      {searchedHandle.wallet_addresses.map((addr: WalletAddress, idx: number) => (
                        <Card key={idx} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {addr.chain.toUpperCase()}
                                </Badge>
                                {addr.verified && (
                                  <Badge variant="secondary">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="font-mono text-sm break-all">
                                {addr.address}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyToClipboard(addr.address)}
                              className="ml-2"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
