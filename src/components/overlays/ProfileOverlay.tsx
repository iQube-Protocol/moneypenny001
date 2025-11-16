import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, TrendingUp, DollarSign, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface BankingDocument {
  id: string;
  name: string;
  month: string;
  size: string;
  uploaded: string;
}

export function ProfileOverlay() {
  const [documents, setDocuments] = useState<BankingDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const moneyPenny = useMoneyPenny();

  // Fetch real aggregates and recommendations from backend
  const { data: aggregatesData, refetch: refetchAggregates } = useQuery({
    queryKey: ['banking-aggregates'],
    queryFn: async () => {
      try {
        return await moneyPenny.aggregates.getAggregates();
      } catch (error) {
        console.error("Failed to fetch aggregates:", error);
        return null;
      }
    },
    refetchOnWindowFocus: false,
  });

  const { data: recommendationsData } = useQuery({
    queryKey: ['banking-recommendations'],
    queryFn: async () => {
      try {
        return await moneyPenny.aggregates.getRecommendations();
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
        return null;
      }
    },
    refetchOnWindowFocus: false,
  });

  const aggregates = {
    avgSurplus: aggregatesData?.surplus_mean_daily || 0,
    surplusVol: aggregatesData?.surplus_vol_daily || 0,
    lastBalance: aggregatesData?.closing_balance_last || 0,
  };

  const suggestedPolicy = recommendationsData || {
    inventory_band: { min_qc: 250, max_qc: 2500 },
    min_edge_bps_baseline: 1.0,
    daily_loss_limit_bps: 4.0,
    max_notional_usd_day: 250.0,
    confidence: 0.5,
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload documents",
          variant: "destructive",
        });
        return;
      }

      const uploadedPaths: string[] = [];
      const uploadedDocs: BankingDocument[] = [];
      
      // Upload each file to Supabase Storage
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('banking-documents')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        uploadedPaths.push(filePath);
        
        uploadedDocs.push({
          id: filePath,
          name: file.name,
          month: new Date().toISOString().slice(0, 7),
          size: `${(file.size / 1024).toFixed(1)} KB`,
          uploaded: new Date().toISOString(),
        });
      }
      
      setDocuments(prev => [...prev, ...uploadedDocs]);
      
      // Trigger banking document parser
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        'banking-document-parser',
        {
          body: {
            file_paths: uploadedPaths,
            user_id: user.id,
          }
        }
      );
      
      if (parseError) {
        console.error("Parser error:", parseError);
        toast({
          title: "Analysis failed",
          description: "Could not analyze bank statements. Using uploaded files for future analysis.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Documents analyzed",
        description: `${files.length} file(s) processed. Financial profile updated.`,
      });
      
      // Refresh aggregates
      await refetchAggregates();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Document deleted",
      description: "Banking document removed",
    });
  };

  const applyToConsole = async () => {
    try {
      // Save policy to localStorage for intent form
      localStorage.setItem('moneypenny_applied_config', JSON.stringify(suggestedPolicy));
      
      toast({
        title: "Policy applied",
        description: "Trading policy has been applied to console",
      });
    } catch (error) {
      console.error("Apply policy error:", error);
      toast({
        title: "Application failed",
        description: "Could not apply policy to console",
        variant: "destructive",
      });
    }
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
            <Button size="sm" variant="outline" className="gap-2" disabled={isUploading} asChild>
              <span>
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {isUploading ? 'Processing...' : 'Upload'}
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
            <p className="text-muted-foreground">Inventory Band (Q¢)</p>
            <p className="font-mono">{suggestedPolicy.inventory_band?.min_qc || 250} - {suggestedPolicy.inventory_band?.max_qc || 2500}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Edge (bps)</p>
            <p className="font-mono">{suggestedPolicy.min_edge_bps_baseline || 1.0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily Loss Limit</p>
            <p className="font-mono">{suggestedPolicy.daily_loss_limit_bps || 4.0} bps</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Notional</p>
            <p className="font-mono">${suggestedPolicy.max_notional_usd_day || 250.0}</p>
          </div>
        </div>
        <Button size="sm" className="w-full mt-3" onClick={applyToConsole}>
          Apply to Console
        </Button>
      </Card>
    </div>
  );
}
