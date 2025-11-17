import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { WalletDrawer } from "@/components/WalletDrawer";
export default function Index() {
  return <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border glass-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Aigent MoneyPenny</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/console">
                <Button variant="outline" size="sm">Console</Button>
              </Link>
              <Link to="/profile">
                
              </Link>
              <WalletDrawer />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm">Powered by AgentiQ & Qripto</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="neon-text">MoneyPenny</span>
            <br />
            <span className="text-foreground/80">Q¢ HFT Aigent</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            QriptoCENT (Q¢) micro-slippage HFT agent. Cross-chain execution with real-time quotes, intelligent risk controls, and hyper-personalized insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link to="/console">
              <Button size="lg" className="gap-2 text-lg px-8">
                <TrendingUp className="h-5 w-5" />
                Open Console
              </Button>
            </Link>
            <Link to="/profile">
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
                <Shield className="h-5 w-5" />
                Setup Profile
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 glass-hover">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">HFT Console</h3>
            <p className="text-sm text-muted-foreground">
              Real-time cross-chain quotes with micro-slippage discovery across 7 chains. 
              Live fills, P&L tracking, and edge gauges.
            </p>
          </div>

          <div className="glass-card p-6 glass-hover">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Banking Wizard</h3>
            <p className="text-sm text-muted-foreground">
              Upload 6 months of statements. Get personalized trading policies based on your 
              surplus, volatility, and spending patterns.
            </p>
          </div>

          <div className="glass-card p-6 glass-hover">
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">MetaVatar AI</h3>
            <p className="text-sm text-muted-foreground">
              Friendly AI guide powered by MoneyPenny. Demystifies HFT, explains risk controls, 
              and provides market context.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Chains */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Supported Chains</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Bitcoin", "Ethereum", "Solana", "Arbitrum", "Base", "Optimism", "Polygon"].map(chain => <div key={chain} className="glass-card px-6 py-3 glass-hover">
                <span className="font-medium">{chain}</span>
              </div>)}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border glass-card py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Aigent MoneyPenny © 2025 • Privacy-first trading with Smart Buckets & Memories</p>
        </div>
      </footer>
    </div>;
}