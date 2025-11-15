/**
 * Execution Module
 * Intent submission and execution tracking
 */

import { MoneyPennyClient } from '../client';

export interface Intent {
  intent_id: string;
  chain: string;
  side: 'BUY' | 'SELL';
  amount_qc: number;
  min_edge_bps: number;
  max_slippage_bps: number;
  status: 'pending' | 'quoted' | 'executing' | 'filled' | 'cancelled' | 'failed';
  created_at: string;
  expires_at: string;
}

export interface Execution {
  execution_id: string;
  intent_id: string;
  chain: string;
  side: 'BUY' | 'SELL';
  qty_filled: number;
  avg_price: number;
  capture_bps: number;
  tx_hash?: string;
  gas_used?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

export class ExecutionModule {
  constructor(private client: MoneyPennyClient) {}

  // Submit trading intent
  async submitIntent(
    chain: string,
    side: 'BUY' | 'SELL',
    amountQc: number,
    minEdgeBps: number,
    maxSlippageBps: number = 5.0
  ): Promise<Intent> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.executionUrl}/intent/submit`, {
      method: 'POST',
      body: JSON.stringify({
        chain,
        side,
        amount_qc: amountQc,
        min_edge_bps: minEdgeBps,
        max_slippage_bps: maxSlippageBps,
      }),
    });
  }

  // Get intent status
  async getIntent(intentId: string): Promise<Intent> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.executionUrl}/intent/${intentId}`);
  }

  // List intents
  async listIntents(status?: Intent['status']): Promise<Intent[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    const statusParam = status ? `&status=${status}` : '';
    return this.client['fetch'](
      `${config.executionUrl}/intent?scope=${scope}${statusParam}`
    );
  }

  // Cancel intent
  async cancelIntent(intentId: string): Promise<{ cancelled: boolean }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.executionUrl}/intent/${intentId}/cancel`, {
      method: 'POST',
    });
  }

  // Get execution details
  async getExecution(executionId: string): Promise<Execution> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.executionUrl}/execution/${executionId}`);
  }

  // List executions
  async listExecutions(limit: number = 50): Promise<Execution[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.executionUrl}/execution?scope=${scope}&limit=${limit}`
    );
  }

  // Get execution statistics
  async getStats(period: '24h' | '7d' | '30d' = '24h'): Promise<{
    total_fills: number;
    total_volume_usd: number;
    avg_capture_bps: number;
    chains_traded: string[];
    win_rate: number;
  }> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      return {
        total_fills: 0,
        total_volume_usd: 0,
        avg_capture_bps: 0,
        chains_traded: [],
        win_rate: 0,
      };
    }

    return this.client['fetch'](
      `${config.executionUrl}/stats?scope=${scope}&period=${period}`
    );
  }
}
