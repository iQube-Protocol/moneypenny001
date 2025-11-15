import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

export function MetaVatarOverlay() {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const initializeAgent = () => {
    console.log('[MetaVatar] Initializing D-ID agent...');
    
    const container = document.getElementById('did-agent-container');
    if (!container) {
      console.error('[MetaVatar] Container not found');
      setError(true);
      return;
    }

    // Clear any existing content
    container.innerHTML = '';

    // Get credentials from environment
    const clientKey = import.meta.env.VITE_DID_CLIENT_KEY || 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2';
    const agentId = import.meta.env.VITE_DID_AGENT_ID || 'v2_agt_dY78cKv2';

    // Create script element with D-ID v1 loader
    const script = document.createElement('script');
    script.src = 'https://agent.d-id.com/v1/index.js';
    script.type = 'module';
    script.setAttribute('data-name', 'did-agent');
    script.setAttribute('data-mode', 'embed');
    script.setAttribute('data-client-key', clientKey);
    script.setAttribute('data-agent-id', agentId);
    script.setAttribute('data-monitor', 'false');
    script.setAttribute('data-container', 'did-agent-container');

    console.log('[MetaVatar] Appending script to container');

    // Set up timeout to detect mount failure
    const mountTimeout = setTimeout(() => {
      console.error('[MetaVatar] Script mount timeout after 5s');
      if (retryCount < 1) {
        console.warn('[MetaVatar] Retrying initialization...');
        setRetryCount(prev => prev + 1);
        container.removeChild(script);
        initializeAgent();
      } else {
        console.error('[MetaVatar] Max retries reached');
        setError(true);
      }
    }, 5000);

    script.addEventListener('load', () => {
      clearTimeout(mountTimeout);
      console.log('[MetaVatar] Script loaded successfully');
    });

    script.addEventListener('error', (e) => {
      clearTimeout(mountTimeout);
      console.error('[MetaVatar] Script load error:', e);
      if (retryCount < 1) {
        console.warn('[MetaVatar] Retrying after error...');
        setRetryCount(prev => prev + 1);
        initializeAgent();
      } else {
        setError(true);
      }
    });

    container.appendChild(script);
  };

  useEffect(() => {
    initializeAgent();

    return () => {
      const container = document.getElementById('did-agent-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  const handleRetry = () => {
    setError(false);
    setRetryCount(0);
    initializeAgent();
  };

  const clientKey = import.meta.env.VITE_DID_CLIENT_KEY || 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2';
  const agentId = import.meta.env.VITE_DID_AGENT_ID || 'v2_agt_dY78cKv2';
  const fallbackUrl = `https://agent.d-id.com/v1/?mode=embed&client-key=${clientKey}&agent-id=${agentId}`;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold neon-text">MetaVatar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered avatar interface
        </p>
      </div>
      
      <div className="flex-1 relative min-h-[560px]">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <span>Failed to load MetaVatar agent. Please try again or open in a new tab.</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(fallbackUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in new tab
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        
        <div 
          id="did-agent-container" 
          className="absolute inset-0 rounded-lg bg-card/50 overflow-hidden" 
        />
      </div>
    </div>
  );
}
