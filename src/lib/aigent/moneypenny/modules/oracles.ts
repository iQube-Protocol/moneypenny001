/**
 * Oracles Module
 * Gas prices, reference prices, chain health
 */

import { MoneyPennyClient } from '../client';

export interface GasPrice {
  chain: string;
  fast: number;
  standard: number;
  slow: number;
  unit: string; // e.g., "gwei", "lamports"
  timestamp: string;
  freshness_sec: number;
}

export interface ReferencePrice {
  symbol: string;
  price_usd: number;
  source: string;
  timestamp: string;
  freshness_sec: number;
}

export interface ChainHealth {
  chain: string;
  status: 'healthy' | 'degraded' | 'down';
  block_height: number;
  avg_block_time_sec: number;
  rpc_latency_ms: number;
  timestamp: string;
}

export class OraclesModule {
  constructor(private client: MoneyPennyClient) {}

  // === Gas Oracles ===

  // Get gas price for specific chain
  async getGasPrice(chain: string): Promise<GasPrice> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/gas/${chain}`, {
      skipAuth: true,
    });
  }

  // Get gas prices for multiple chains
  async getGasPrices(chains: string[]): Promise<GasPrice[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/gas/batch`, {
      method: 'POST',
      body: JSON.stringify({ chains }),
      skipAuth: true,
    });
  }

  // === Price Oracles ===

  // Get reference price for asset
  async getReferencePrice(symbol: string): Promise<ReferencePrice> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/price/${symbol}`, {
      skipAuth: true,
    });
  }

  // Get reference prices for multiple assets
  async getReferencePrices(symbols: string[]): Promise<ReferencePrice[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/price/batch`, {
      method: 'POST',
      body: JSON.stringify({ symbols }),
      skipAuth: true,
    });
  }

  // === Chain Health ===

  // Get chain health status
  async getChainHealth(chain: string): Promise<ChainHealth> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/health/${chain}`, {
      skipAuth: true,
    });
  }

  // Get health for multiple chains
  async getChainsHealth(chains: string[]): Promise<ChainHealth[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.oracleUrl}/health/batch`, {
      method: 'POST',
      body: JSON.stringify({ chains }),
      skipAuth: true,
    });
  }

  // === Polling ===

  // Start polling gas prices
  startGasPricePolling(
    chains: string[],
    onUpdate: (prices: GasPrice[]) => void,
    intervalMs?: number
  ): () => void {
    const config = this.client.getConfig();
    const interval = intervalMs || config.oraclePollIntervalMs;

    const poll = async () => {
      try {
        const prices = await this.getGasPrices(chains);
        onUpdate(prices);
      } catch (error) {
        console.error('Gas price poll error:', error);
      }
    };

    // Initial poll
    poll();

    // Start interval
    const intervalId = setInterval(poll, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  // Start polling chain health
  startHealthPolling(
    chains: string[],
    onUpdate: (health: ChainHealth[]) => void,
    intervalMs?: number
  ): () => void {
    const config = this.client.getConfig();
    const interval = intervalMs || config.oraclePollIntervalMs;

    const poll = async () => {
      try {
        const health = await this.getChainsHealth(chains);
        onUpdate(health);
      } catch (error) {
        console.error('Health poll error:', error);
      }
    };

    poll();
    const intervalId = setInterval(poll, interval);
    return () => clearInterval(intervalId);
  }
}
