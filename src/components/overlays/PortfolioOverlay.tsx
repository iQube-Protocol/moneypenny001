import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Activity } from "lucide-react";
import { PortfolioAnalytics } from "@/components/PortfolioAnalytics";

export function PortfolioOverlay() {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Portfolio</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time portfolio performance and analytics
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">$12,450</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Change</p>
              <p className="text-lg font-bold text-success">+$247</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Positions</p>
              <p className="text-lg font-bold">8</p>
            </div>
          </div>
        </Card>
      </div>

      <PortfolioAnalytics />
    </div>
  );
}
