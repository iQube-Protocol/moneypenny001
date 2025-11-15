import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, TrendingUp, DollarSign, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BankingDocument {
  id: string;
  name: string;
  month: string;
  size: string;
  uploaded: string;
}

export function ProfileOverlay() {
  const [documents, setDocuments] = useState<BankingDocument[]>([]);
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
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your banking documents and trading preferences
        </p>
      </div>

      {/* Financial Aggregates */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">Financial Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Surplus</p>
              <p className="text-sm font-bold">${aggregates.avgSurplus}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Volatility</p>
              <p className="text-sm font-bold">{aggregates.surplusVol}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-sm font-bold">${aggregates.lastBalance}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Banking Documents - Compact */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Banking Documents</h3>
          <label>
            <Input
              type="file"
              multiple
              accept=".pdf,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <span>
                <Upload className="h-3 w-3" />
                Upload
              </span>
            </Button>
          </label>
        </div>
        
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No documents uploaded yet
          </p>
        ) : (
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium truncate max-w-[200px]">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.size}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDocument(doc.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Trading Policy Suggestions */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Suggested Trading Policy</h3>
          <Badge variant="outline" className="text-xs">AI Generated</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Inventory Band</p>
            <p className="font-mono">${suggestedPolicy.inventoryBand.min} - ${suggestedPolicy.inventoryBand.max}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Edge (bps)</p>
            <p className="font-mono">{suggestedPolicy.minEdgeBps}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily Loss Limit</p>
            <p className="font-mono">{suggestedPolicy.dailyLossLimit}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Notional</p>
            <p className="font-mono">${suggestedPolicy.maxNotionalUsd}</p>
          </div>
        </div>
        <Button size="sm" className="w-full mt-3" onClick={applyToConsole}>
          Apply to Console
        </Button>
      </Card>
    </div>
  );
}
