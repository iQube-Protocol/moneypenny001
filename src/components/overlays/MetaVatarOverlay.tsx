import { useEffect } from 'react';

export function MetaVatarOverlay() {
  useEffect(() => {
    const container = document.getElementById('did-agent-container');
    if (!container) {
      console.error('[MetaVatar] Container not found');
      return;
    }

    // Build params once
    const params = new URLSearchParams({
      mode: 'embed',
      'client-key': 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2',
      'agent-id': 'v2_agt_dY78cKv2',
    });

    // Try multiple candidate paths (CDN variations) to avoid NoSuchKey errors
    const candidates = [
      `https://agent.d-id.com/v2/?${params.toString()}`,
      `https://agent.d-id.com/v2/index.html?${params.toString()}`,
      `https://agent.d-id.com/?${params.toString()}`,
      `https://agent.d-id.com/index.html?${params.toString()}`,
    ];

    let iframe: HTMLIFrameElement | null = null;
    let idx = 0;
    let retryTimer: number | undefined;

    const tryNext = () => {
      if (iframe) {
        try { container.removeChild(iframe); } catch {}
      }
      iframe = document.createElement('iframe');
      iframe.allow = 'microphone; camera; autoplay';
      iframe.referrerPolicy = 'no-referrer';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.src = candidates[idx];
      container.appendChild(iframe);

      // Fallback if it doesn't load in time
      retryTimer = window.setTimeout(() => {
        idx++;
        if (idx < candidates.length) {
          console.warn('[MetaVatar] Retrying with alternate embed path:', candidates[idx]);
          tryNext();
        } else {
          console.error('[MetaVatar] All embed paths failed. Check network tab for details.');
        }
      }, 3000);

      iframe.addEventListener('load', () => {
        if (retryTimer) {
          window.clearTimeout(retryTimer);
          retryTimer = undefined;
        }
        console.log('[MetaVatar] Embedded via', iframe?.src);
      });

      iframe.addEventListener('error', () => {
        if (retryTimer) window.clearTimeout(retryTimer);
        idx++;
        if (idx < candidates.length) tryNext();
      });
    };

    tryNext();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold neon-text">MetaVatar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered avatar interface
        </p>
      </div>
      
      <div className="flex-1 relative min-h-[500px]">
        <div id="did-agent-container" className="absolute inset-0 rounded-lg bg-card/50 overflow-hidden" />
      </div>
    </div>
  );
}
