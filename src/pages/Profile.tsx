import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WalletDrawer } from "@/components/WalletDrawer";
import { Upload, FileText, Trash2, TrendingUp, DollarSign, Activity, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BankingDocument {
  id: string;
  name: string;
  month: string;
  size: string;
  uploaded: string;
}

export default function Profile() {
  const [documents, setDocuments] = useState<BankingDocument[]>([]);
  const [consentEnabled, setConsentEnabled] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const { toast } = useToast();

  const aggregates = {
    avgSurplus: 41.8,
    surplusVol: 17.3,
    lastBalance: 2180.55,
  };

  const suggestedPolicy = {
    inventoryBand: { min: 250, max: 2500 },
    minEdgeBps: 1.0,
    dailyLossLimit: 4.0,
    maxNotionalUsd: 250.0,
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const newDoc: BankingDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          month: "2024-06",
          size: `${(file.size / 1024).toFixed(1)} KB`,
          uploaded: new Date().toISOString(),
        };
        setDocuments(prev => [...prev, newDoc]);
      });
      toast({
        title: "Documents uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Document deleted",
      description: "Banking document removed",
    });
  };

  const applyToConsole = () => {
    toast({
      title: "Policy applied",
      description: "Trading policy has been applied to console",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold neon-text">Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your banking documents and trading preferences
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/console">
                <Button variant="outline" size="sm">Console</Button>
              </Link>
              <WalletDrawer />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Documents & Upload */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Banking Documents</h2>
                  <p className="text-sm text-muted-foreground">Upload last 6 months of statements</p>
                </div>
                <label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button size="sm" className="gap-2" asChild>
                    <span>
                      <Upload className="h-4 w-4" />
                      Upload
                    </span>
                  </Button>
                </label>
              </div>

              <div className="space-y-2 mb-6">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No documents uploaded yet</p>
                    <p className="text-xs">Upload PDF or CSV bank statements to get started</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 glass-card glass-hover">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.month} • {doc.size}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between p-4 glass-card">
                <div className="flex-1">
                  <Label htmlFor="consent-toggle" className="text-sm font-medium cursor-pointer">
                    Allow redacted excerpts for answers
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    MoneyPenny can use redacted statements to answer specific questions
                  </p>
                </div>
                <Switch
                  id="consent-toggle"
                  checked={consentEnabled}
                  onCheckedChange={setConsentEnabled}
                />
              </div>
            </Card>

            {/* Banking Wizard */}
            {documents.length > 0 && (
              <Card className="glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Banking Wizard</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map(step => (
                      <div
                        key={step}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          step <= wizardStep ? 'bg-primary' : 'bg-secondary'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                      <div className="text-2xl font-bold font-mono neon-text">
                        ${suggestedPolicy.inventoryBand.min}-{suggestedPolicy.inventoryBand.max}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Inventory Band (Q¢)</div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="text-2xl font-bold font-mono text-warning">
                        {suggestedPolicy.minEdgeBps} bps
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Min Edge Baseline</div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="text-2xl font-bold font-mono text-destructive">
                        {suggestedPolicy.dailyLossLimit} bps
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Daily Loss Limit</div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="text-2xl font-bold font-mono text-success">
                        ${suggestedPolicy.maxNotionalUsd}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Max Daily Notional</div>
                    </div>
                  </div>

                  <Button className="w-full" onClick={applyToConsole}>
                    Apply to Console
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Aggregates */}
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Financial Aggregates</h3>
              
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Avg Daily Surplus</span>
                  </div>
                  <div className="text-2xl font-bold font-mono data-positive">
                    ${aggregates.avgSurplus.toFixed(2)}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Surplus Volatility</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-warning">
                    ${aggregates.surplusVol.toFixed(2)}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Last Closing Balance</span>
                  </div>
                  <div className="text-2xl font-bold font-mono neon-text">
                    ${aggregates.lastBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Privacy Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Raw statements</span>
                  <Badge variant="secondary">Sealed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aggregates only</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Redacted excerpts</span>
                  <Badge variant={consentEnabled ? "default" : "secondary"}>
                    {consentEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
