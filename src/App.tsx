import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Console from "./pages/Console";
import Profile from "./pages/Profile";
import MetaVatar from "./pages/MetaVatar";
import NotFound from "./pages/NotFound";
import { Auth } from "./components/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { initMoneyPenny } from "./lib/aigent/moneypenny/client";
import { createConfigFromEnv, validateConfig } from "./lib/aigent/core/config";
import { OverlayManager } from "./components/overlays/OverlayManager";

const queryClient = new QueryClient();

// Initialize MoneyPenny client
const config = createConfigFromEnv();
const validation = validateConfig(config);

if (!validation.valid) {
  console.error('❌ MoneyPenny config validation failed:', validation.errors);
  validation.errors.forEach(error => console.error(`  - ${error}`));
} else {
  console.log('✅ MoneyPenny config validated successfully');
}

const moneyPenny = initMoneyPenny(config, queryClient);

const App = () => {
  const [healthStatus, setHealthStatus] = useState<string>('checking');
  const [currentStrategy, setCurrentStrategy] = useState<any>(null);

  useEffect(() => {
    // Test all module connections
    const testConnections = async () => {
      console.log('🔍 Testing MoneyPenny module connections...\n');

      try {
        // Test health check
        const health = await moneyPenny.healthCheck();
        console.log('📊 Health Status:', health.status);
        console.log('   Services:', health.services);

        // Test module availability
        const modules = {
          auth: !!moneyPenny.auth,
          x402: !!moneyPenny.x402,
          fio: !!moneyPenny.fio,
          storage: !!moneyPenny.storage,
          aggregates: !!moneyPenny.aggregates,
          memories: !!moneyPenny.memories,
          anchors: !!moneyPenny.anchors,
          agents: !!moneyPenny.agents,
          quotes: !!moneyPenny.quotes,
          execution: !!moneyPenny.execution,
          oracles: !!moneyPenny.oracles,
        };

        console.log('📦 Modules loaded:', modules);
        
        const allModulesLoaded = Object.values(modules).every(v => v);
        console.log(`✅ All modules ${allModulesLoaded ? 'loaded successfully' : 'had issues'}`);

        // Test external adapters
        console.log('🔌 External Adapters:');
        console.log('   Tavily:', moneyPenny.tavily ? '✅ initialized' : '⚠️ not configured');
        console.log('   Redis:', moneyPenny.redis ? (moneyPenny.redis.isConnected() ? '✅ connected' : '⚠️ not connected') : '⚠️ not configured');

        // Test config access
        const testConfig = moneyPenny.getConfig();
        console.log('⚙️ Configuration:');
        console.log('   Agent Class:', testConfig.agentClass);
        console.log('   Tenant ID:', testConfig.tenantId || 'not set');
        console.log('   Enable A2A:', testConfig.enableA2A);
        console.log('   Enable MetaMask:', testConfig.enableMetaMask);
        console.log('   Enable UniSat:', testConfig.enableUniSat);
        console.log('   Enable Phantom:', testConfig.enablePhantom);

        setHealthStatus(health.status);
        console.log('\n✅ MoneyPenny initialization complete!');
      } catch (error) {
        console.error('❌ Module connection test failed:', error);
        setHealthStatus('error');
      }
    };

    testConnections();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/console" element={
              <ProtectedRoute>
                <Console />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/metavatar" element={<MetaVatar />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <OverlayManager 
            currentStrategy={currentStrategy} 
            onStrategyChange={setCurrentStrategy}
          />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
