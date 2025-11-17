import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, TrendingUp, DollarSign, Activity, Loader2, RefreshCw, BarChart3, Target, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { extractPDFText } from "@/lib/pdf/extractText";
import { EdgeGauge } from "@/components/EdgeGauge";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { Progress } from "@/components/ui/progress";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const moneyPenny = useMoneyPenny();
  const overlayManager = useOverlayManager();

  // Fetch bank statements from database
  const { data: bankStatements, refetch: refetchStatements } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to BankingDocument format
      return (data || []).map(stmt => ({
        id: stmt.id,
        name: stmt.file_name,
        month: stmt.period_start ? new Date(stmt.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
        size: '0 KB',
        uploaded: stmt.created_at ? new Date(stmt.created_at).toLocaleDateString() : 'Unknown'
      }));
    }
  });

  // Update local state when bank statements are fetched
  useEffect(() => {
    if (bankStatements) {
      setDocuments(bankStatements);
    }
  }, [bankStatements]);

  // Fetch real aggregates and recommendations from backend
  const { data: aggregatesData, refetch: refetchAggregates, isLoading: aggregatesLoading } = useQuery({
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

  const { data: recommendationsData, refetch: refetchRecommendations, isLoading: recommendationsLoading } = useQuery({
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
    inventory_min: 0,
    inventory_max: 500,
    min_edge_bps: 1.0,
    daily_loss_limit_bps: 10.0,
    max_notional_usd: 100.0,
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
        setIsUploading(false);
        return;
      }

      const uploadedPaths: string[] = [];
      const uploadedDocs: BankingDocument[] = [];
      const extractedTexts: Array<{ file_path: string; text: string; name: string }> = [];
      
      // Upload each file to Supabase Storage and extract text
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
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

        // Extract text from PDF
        try {
          toast({
            title: "Extracting text",
            description: `Reading ${file.name}...`,
          });
          
          const { text } = await extractPDFText(file);
          extractedTexts.push({
            file_path: filePath,
            text,
            name: file.name,
          });
        } catch (extractError) {
          console.error('PDF extraction error:', extractError);
          toast({
            title: "Extraction warning",
            description: `Could not extract text from ${file.name}`,
            variant: "destructive",
          });
        }
      }
      
      setDocuments(prev => [...prev, ...uploadedDocs]);

      if (extractedTexts.length === 0) {
        toast({
          title: "No text extracted",
          description: "Could not extract text from any PDFs",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      
      // Trigger banking document parser with extracted text
      toast({
        title: "Analyzing statements",
        description: `Processing ${extractedTexts.length} document(s)...`,
      });

      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        'banking-document-parser',
        {
          body: {
            file_paths: uploadedPaths,
            user_id: user.id,
            extracted_texts: extractedTexts,
          },
        }
      );
      
      if (parseError) {
        console.error('Parse error:', parseError);
        throw new Error(`Failed to parse documents: ${parseError.message}`);
      }

      if (parseResult?.error) {
        if (parseResult.error === "No transactions extracted") {
          toast({
            title: "No transactions found",
            description: "Could not recognize transactions in the uploaded statements",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
        throw new Error(parseResult.error);
      }
      
      toast({
        title: "Analysis complete",
        description: `Processed ${parseResult.statements_processed} statement(s)`,
      });

      // Refetch aggregates and recommendations
      await Promise.all([
        refetchAggregates(), 
        refetchRecommendations(),
        refetchStatements()
      ]);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      // Find the statement to get file path
      const statement = bankStatements?.find(s => s.id === id);
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('bank_statements')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete from storage if we have the file path
      if (statement) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const filePath = `${user.id}/${statement.name}`;
          await supabase.storage
            .from('banking-documents')
            .remove([filePath]);
        }
      }

      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== id));

      toast({
        title: "Document deleted",
        description: "Banking document removed successfully",
      });

      refetchStatements();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete document",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete all banking documents from storage
      const { data: files } = await supabase.storage
        .from('bank-statements')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage
          .from('bank-statements')
          .remove(filePaths);
      }

      // Delete all records from database tables
      await Promise.all([
        supabase.from('bank_statements').delete().eq('user_id', user.id),
        supabase.from('financial_aggregates').delete().eq('user_id', user.id),
        supabase.from('trading_recommendations').delete().eq('user_id', user.id)
      ]);

      // Clear local state
      setDocuments([]);

      // Refetch to confirm everything is cleared
      await Promise.all([
        refetchAggregates(),
        refetchRecommendations(),
        refetchStatements()
      ]);

      toast({
        title: "Data cleared",
        description: "All banking documents and financial data have been reset",
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Could not clear data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyToConsole = async () => {
    try {
      // Apply recommendations to backend
      await moneyPenny.aggregates.applyRecommendations(suggestedPolicy);
      
      toast({
        title: "Policy applied",
        description: "Trading parameters have been updated",
      });

      // Open intent capture overlay with prefilled values
      overlayManager.openOverlay('intent-capture');
    } catch (error) {
      console.error('Apply error:', error);
      toast({
        title: "Failed to apply policy",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const cashBuffer = aggregates.lastBalance > 0 && aggregates.avgSurplus > 0
    ? (aggregates.lastBalance / Math.abs(aggregates.avgSurplus)).toFixed(1)
    : "N/A";

  return (
    <div className="w-full h-full overflow-auto bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Financial Profile</h1>
            <p className="text-sm text-muted-foreground">
              Upload bank statements to generate personalized trading recommendations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || aggregatesLoading || recommendationsLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Financial Overview */}
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Financial Overview</h2>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Daily Surplus</p>
              <div className="flex items-baseline gap-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {aggregates.avgSurplus.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                <div className="h-full bg-primary" style={{ width: `${Math.min((aggregates.avgSurplus / 500) * 100, 100)}%` }} />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Volatility</p>
              <div className="flex items-baseline gap-1">
                <Activity className="h-3 w-3 text-warning" />
                <span className="text-xl font-bold text-foreground">
                  {aggregates.surplusVol.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                <div className="h-full bg-warning" style={{ width: `${Math.min((aggregates.surplusVol / 200) * 100, 100)}%` }} />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Balance</p>
              <div className="flex items-baseline gap-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {aggregates.lastBalance.toFixed(2)}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                <div className="h-full bg-accent" style={{ width: `${Math.min((aggregates.lastBalance / 20000) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cash Buffer</p>
              <div className="flex items-baseline gap-1">
                <Activity className="h-3 w-3 text-accent" />
                <span className="text-xl font-bold text-foreground">{cashBuffer}</span>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                <div className="h-full bg-accent" style={{ width: `${Math.min((parseFloat(cashBuffer === 'N/A' ? '0' : cashBuffer) / 100) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Banking Documents */}
        <Card className="p-4 glass-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Banking Documents</h2>
            </div>
            
            <label htmlFor="file-upload">
              <Button 
                variant="outline" 
                disabled={isUploading}
                className="cursor-pointer"
                asChild
              >
                <div>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </>
                  )}
                </div>
              </Button>
            </label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>

          <ScrollArea className="h-[120px]">
            {documents.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.month} • {doc.size}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Suggested Trading Policy */}
        <Card className="p-4 glass-card">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Suggested Trading Policy</h2>
              <Badge variant="outline" className="ml-auto text-xs">
                AI-Generated
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="scale-90 origin-top-left">
                <EdgeGauge
                  floorBps={0.5}
                  minEdgeBps={suggestedPolicy.min_edge_bps}
                  liveEdgeBps={suggestedPolicy.min_edge_bps}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Inventory Range</p>
                  <p className="text-base font-semibold text-foreground">
                    ${suggestedPolicy.inventory_min} - ${suggestedPolicy.inventory_max}
                  </p>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min((suggestedPolicy.inventory_max / 5000) * 100, 100)}%` }} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Min Edge</p>
                  <p className="text-base font-semibold text-foreground">
                    {suggestedPolicy.min_edge_bps} bps
                  </p>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min((suggestedPolicy.min_edge_bps / 5) * 100, 100)}%` }} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Max Notional/Day</p>
                  <p className="text-base font-semibold text-foreground">
                    ${suggestedPolicy.max_notional_usd}
                  </p>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min((suggestedPolicy.max_notional_usd / 200) * 100, 100)}%` }} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Daily Loss Limit</p>
                  <p className="text-base font-semibold text-foreground">
                    {suggestedPolicy.daily_loss_limit_bps} bps
                  </p>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-warning" style={{ width: `${Math.min((suggestedPolicy.daily_loss_limit_bps / 50) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {recommendationsData?.reasoning && (
                <div className="p-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                  {recommendationsData.reasoning}
                </div>
              )}

              <Button 
                onClick={applyToConsole}
                className="w-full"
              >
                Apply to Console
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
