/**
 * Quotes Module
 * HFT Console - Quote discovery and streaming (SIM + LIVE)
 */

import { MoneyPennyClient } from '../client';

export type QuoteEvent = {
  status: 'QUOTE';
  chain: string;
  edge_bps: number;
  floor_bps: number;
  price_usdc: number;
  qty_qc: number;
  ts: string;
};

export type FillEvent = {
  status: 'FILL';
  chain: string;
  side: 'BUY' | 'SELL';
  qty_qct: number;
  price_usdc: number;
  capture_bps: number;
  notional_usd: number;
  txid?: string;
  ts: string;
};

export type PnLEvent = {
  status: 'P&L';
  capture_bps: number;
  turnover_usd: number;
  peg_usd: number;
  ts: string;
};

export type StreamEvent = QuoteEvent | FillEvent | PnLEvent;

export class QuotesModule {
  constructor(private client: MoneyPennyClient) {}

  // === SIM Mode (Simulation) ===

  // Start SIM quote stream
  startSimStream(
    chains: string[],
    onEvent: (event: StreamEvent) => void,
    onError?: (error: any) => void
  ): EventSource {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    const url = `${config.quotesUrl}/sim/stream?k=${Math.random()}&chains=${chains.join(',')}&scope=${scope || 'demo'}`;

    const eventSource = this.client['createEventSource'](url, {
      onMessage: (data) => {
        onEvent(data);
        
        // Cache in Redis if available
        if (this.client.redis) {
          if (data.status === 'QUOTE') {
            this.client.redis.cacheQuote(scope || 'demo', data).catch(console.error);
          } else if (data.status === 'FILL') {
            this.client.redis.cacheFill(scope || 'demo', data).catch(console.error);
          }
        }
      },
      onError: onError,
    });

    return eventSource;
  }

  // === LIVE Mode ===

  // Get live quotes (snapshot)
  async getLiveQuotes(chains: string[]): Promise<QuoteEvent[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.quotesUrl}/live/quotes`, {
      method: 'POST',
      body: JSON.stringify({ chains }),
    });
  }

  // Start LIVE quote stream
  startLiveStream(
    chains: string[],
    sessionId: string,
    onEvent: (event: StreamEvent) => void,
    onError?: (error: any) => void
  ): EventSource {
    const config = this.client.getConfig();
    
    const url = `${config.quotesUrl}/live/stream?session_id=${sessionId}&chains=${chains.join(',')}`;

    return this.client['createEventSource'](url, {
      onMessage: onEvent,
      onError: onError,
    });
  }

  // === Quote History ===

  // Get cached quotes from Redis
  async getCachedQuotes(count: number = 20): Promise<QuoteEvent[]> {
    if (!this.client.redis) return [];
    
    const scope = this.client.getScope();
    if (!scope) return [];

    try {
      return await this.client.redis.getCachedQuotes(scope, count);
    } catch (error) {
      console.error('Redis cache error:', error);
      return [];
    }
  }

  // Get cached fills from Redis
  async getCachedFills(count: number = 20): Promise<FillEvent[]> {
    if (!this.client.redis) return [];
    
    const scope = this.client.getScope();
    if (!scope) return [];

    try {
      return await this.client.redis.getCachedFills(scope, count);
    } catch (error) {
      console.error('Redis cache error:', error);
      return [];
    }
  }

  // === Quote Request ===

  // Request quotes for specific amount
  async requestQuotes(chains: string[], amountQc: number): Promise<QuoteEvent[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.quotesUrl}/request`, {
      method: 'POST',
      body: JSON.stringify({ chains, amount_qc: amountQc }),
    });
  }
}
