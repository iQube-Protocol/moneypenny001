/**
 * Aggregates Module
 * Non-PII financial aggregates for privacy-first trading recommendations
 */

import { MoneyPennyClient } from '../client';

export interface FinancialAggregate {
  period: string; // e.g., "2025-06"
  surplus_mean_daily: number;
  surplus_vol_daily: number;
  closing_balance_last: number;
  spend_top3: Array<{
    cat: string;
    usd: number;
  }>;
  confidence: number; // 0-1 confidence score
}

export interface TradingRecommendations {
  inventory_band: {
    min_qc: number;
    max_qc: number;
  };
  min_edge_bps_baseline: number;
  daily_loss_limit_bps: number;
  max_notional_usd_day: number;
  reasoning?: string;
  confidence: number;
}

export class AggregatesModule {
  constructor(private client: MoneyPennyClient) {}

  // Fetch financial aggregates (non-PII)
  async getAggregates(): Promise<FinancialAggregate> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      throw new Error('No scope available - please authenticate');
    }

    return this.client['fetch'](
      `${config.aggregateUrl}/profile/aggregates?scope=${scope}`
    );
  }

  // Get trading policy recommendations based on aggregates
  async getRecommendations(): Promise<TradingRecommendations> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      throw new Error('No scope available - please authenticate');
    }

    return this.client['fetch'](
      `${config.apiBaseUrl}/recommendations?scope=${scope}`
    );
  }

  // Apply recommendations to console (save as user policy)
  async applyRecommendations(recs: TradingRecommendations): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.apiBaseUrl}/recommendations/apply`, {
      method: 'POST',
      body: JSON.stringify(recs),
    });
  }

  // Get current trading policy
  async getCurrentPolicy(): Promise<TradingRecommendations | null> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return null;

    try {
      return await this.client['fetch'](
        `${config.apiBaseUrl}/policy/current?scope=${scope}`
      );
    } catch (error) {
      console.error('Get policy error:', error);
      return null;
    }
  }

  // Update trading policy manually
  async updatePolicy(policy: Partial<TradingRecommendations>): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.apiBaseUrl}/policy/update`, {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  // Trigger re-computation of aggregates
  async recomputeAggregates(): Promise<{ job_id: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.aggregateUrl}/profile/recompute`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Get aggregate computation status
  async getComputationStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: FinancialAggregate;
  }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.aggregateUrl}/profile/jobs/${jobId}`
    );
  }
}
