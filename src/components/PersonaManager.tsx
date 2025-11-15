import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { RefreshCw, Plus, User, Check, Copy, QrCode, UserCircle, Shield } from 'lucide-react';

interface Persona {
  did: string;
  fio_handle?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  is_active: boolean;
  verified: boolean;
}

export function PersonaManager() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPersonaForQR, setSelectedPersonaForQR] = useState<Persona | null>(null);
  const [newPersona, setNewPersona] = useState({
    display_name: '',
    fio_handle: '',
    avatar_url: '',
  });
  const { toast } = useToast();

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const moneyPenny = getMoneyPenny();
      
      // Simulate API call to get personas (replace with actual API when available)
      const mockPersonas: Persona[] = [
        {
          did: 'did:didqube:' + Math.random().toString(36).substring(7),
          fio_handle: 'trader@aigent',
          display_name: 'Trading Persona',
          created_at: new Date().toISOString(),
          is_active: true,
          verified: true,
        },
        {
          did: 'did:didqube:' + Math.random().toString(36).substring(7),
          fio_handle: 'hodler@aigent',
          display_name: 'HODL Persona',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          is_active: false,
          verified: false,
        },
      ];
      
      setPersonas(mockPersonas);
      setActivePersona(mockPersonas.find(p => p.is_active) || mockPersonas[0] || null);
    } catch (error) {
      console.error('Load personas error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load personas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleCreatePersona = async () => {
    if (!newPersona.display_name) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const moneyPenny = getMoneyPenny();
      
      // Generate new DID
      const newDid = 'did:didqube:' + Math.random().toString(36).substring(7);
      
      // Register FIO handle if provided
      if (newPersona.fio_handle) {
        await moneyPenny.fio.registerHandle(newPersona.fio_handle.split('@')[0]);
      }
      
      const persona: Persona = {
        did: newDid,
        fio_handle: newPersona.fio_handle || undefined,
        display_name: newPersona.display_name,
        avatar_url: newPersona.avatar_url || undefined,
        created_at: new Date().toISOString(),
        is_active: false,
        verified: false,
      };
      
      setPersonas(prev => [...prev, persona]);
      
      toast({
        title: 'Success',
        description: `Persona "${newPersona.display_name}" created successfully`,
      });
      
      setCreateDialogOpen(false);
      setNewPersona({ display_name: '', fio_handle: '', avatar_url: '' });
    } catch (error) {
      console.error('Create persona error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create persona',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchPersona = async (persona: Persona) => {
    try {
      setPersonas(prev =>
        prev.map(p => ({ ...p, is_active: p.did === persona.did }))
      );
      setActivePersona(persona);
      
      toast({
        title: 'Persona Switched',
        description: `Now using "${persona.display_name}"`,
      });
    } catch (error) {
      console.error('Switch persona error:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch persona',
        variant: 'destructive',
      });
    }
  };

  const handleRegisterFIOHandle = async (personaDid: string, handle: string) => {
    try {
      const moneyPenny = getMoneyPenny();
      await moneyPenny.fio.registerHandle(handle.split('@')[0]);
      
      setPersonas(prev =>
        prev.map(p =>
          p.did === personaDid ? { ...p, fio_handle: handle } : p
        )
      );
      
      toast({
        title: 'Success',
        description: `FIO handle "${handle}" registered`,
      });
    } catch (error) {
      console.error('Register FIO handle error:', error);
      toast({
        title: 'Error',
        description: 'Failed to register FIO handle',
        variant: 'destructive',
      });
    }
  };

  const generateAuthPayload = (persona: Persona) => {
    return JSON.stringify({
      type: 'persona_auth',
      did: persona.did,
      fio_handle: persona.fio_handle,
      display_name: persona.display_name,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const PersonaCard = ({ persona }: { persona: Persona }) => (
    <Card className={persona.is_active ? 'border-primary' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={persona.avatar_url} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{persona.display_name}</h3>
                {persona.is_active && (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
                {persona.verified && (
                  <Shield className="h-4 w-4 text-primary" />
                )}
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-xs">
                    {persona.did.slice(0, 20)}...
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(persona.did, 'DID')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                {persona.fio_handle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-primary">@{persona.fio_handle}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(persona.fio_handle!, 'FIO Handle')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(persona.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!persona.is_active && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSwitchPersona(persona)}
              >
                <Check className="h-4 w-4 mr-1" />
                Switch
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedPersonaForQR(persona);
                setQrDialogOpen(true);
              }}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Persona Management</CardTitle>
              <CardDescription>
                Manage your DiDQube identities and FIO handles
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadPersonas}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New Persona
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Persona</DialogTitle>
                    <DialogDescription>
                      Create a new DiDQube identity with optional FIO handle
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="display_name">Display Name *</Label>
                      <Input
                        id="display_name"
                        placeholder="My Trading Persona"
                        value={newPersona.display_name}
                        onChange={(e) =>
                          setNewPersona({ ...newPersona, display_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="fio_handle">FIO Handle (optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="fio_handle"
                          placeholder="myhandle"
                          value={newPersona.fio_handle.split('@')[0]}
                          onChange={(e) =>
                            setNewPersona({
                              ...newPersona,
                              fio_handle: e.target.value ? `${e.target.value}@aigent` : '',
                            })
                          }
                        />
                        <span className="flex items-center text-muted-foreground">
                          @aigent
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
                      <Input
                        id="avatar_url"
                        placeholder="https://..."
                        value={newPersona.avatar_url}
                        onChange={(e) =>
                          setNewPersona({ ...newPersona, avatar_url: e.target.value })
                        }
                      />
                    </div>
                    <Button onClick={handleCreatePersona} className="w-full">
                      <UserCircle className="w-4 h-4 mr-2" />
                      Create Persona
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="personas">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personas">
                My Personas ({personas.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active Persona
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="personas" className="space-y-4">
              {personas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No personas yet</p>
                  <p className="text-sm">Create your first DiDQube identity</p>
                </div>
              ) : (
                personas.map((persona) => (
                  <PersonaCard key={persona.did} persona={persona} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="active">
              {activePersona ? (
                <div className="space-y-4">
                  <PersonaCard persona={activePersona} />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Active Session</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified:</span>
                        <span>{activePersona.verified ? 'Yes' : 'No'}</span>
                      </div>
                      {activePersona.fio_handle && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">FIO Linked:</span>
                          <span className="text-primary">
                            @{activePersona.fio_handle}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active persona
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mobile Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your mobile device to authenticate
            </DialogDescription>
          </DialogHeader>
          {selectedPersonaForQR && (
            <div className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-background border rounded-lg">
                <QRCodeSVG
                  value={generateAuthPayload(selectedPersonaForQR)}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Persona:</span>
                  <span className="font-semibold">
                    {selectedPersonaForQR.display_name}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span className="text-muted-foreground">DID:</span>
                  <span className="font-mono text-xs">
                    {selectedPersonaForQR.did.slice(0, 20)}...
                  </span>
                </div>
                {selectedPersonaForQR.fio_handle && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="text-muted-foreground">FIO:</span>
                    <span className="text-primary">
                      @{selectedPersonaForQR.fio_handle}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() =>
                  copyToClipboard(
                    generateAuthPayload(selectedPersonaForQR),
                    'Auth payload'
                  )
                }
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Auth Payload
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
