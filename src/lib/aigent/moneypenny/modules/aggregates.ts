/**
 * Aggregates Module
 * Fetches financial aggregates and trading recommendations from Supabase database
 */

import type { MoneyPennyClient } from '../client';
import { supabase } from '@/integrations/supabase/client';

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

  /**
   * Fetch financial aggregates from Supabase database
   */
  async getAggregates(): Promise<FinancialAggregate> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('financial_aggregates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching aggregates:', error);
      throw error;
    }

    if (!data) {
      // Return default values if no aggregates exist yet
      return {
        period: new Date().toISOString().slice(0, 7),
        surplus_mean_daily: 0,
        surplus_vol_daily: 0,
        closing_balance_last: 0,
        spend_top3: [],
        confidence: 0,
      };
    }

    return {
      period: data.computed_at.slice(0, 7),
      surplus_mean_daily: Number(data.avg_daily_surplus),
      surplus_vol_daily: Number(data.surplus_volatility),
      closing_balance_last: Number(data.closing_balance),
      spend_top3: (data.top_categories as any[]) || [],
      confidence: Number(data.confidence_score),
    };
  }

  /**
   * Get trading recommendations from Supabase database
   */
  async getRecommendations(): Promise<TradingRecommendations> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('trading_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }

    if (!data) {
      // Return default conservative values if no recommendations exist yet
      return {
        inventory_band: { min_qc: 50, max_qc: 500 },
        min_edge_bps_baseline: 1.0,
        daily_loss_limit_bps: 10,
        max_notional_usd_day: 100,
        reasoning: 'Default conservative settings',
        confidence: 0.5,
      };
    }

    return {
      inventory_band: {
        min_qc: Number(data.inventory_min),
        max_qc: Number(data.inventory_max),
      },
      min_edge_bps_baseline: Number(data.min_edge_bps),
      daily_loss_limit_bps: Number(data.daily_loss_limit_bps),
      max_notional_usd_day: Number(data.max_notional_usd),
      reasoning: data.reasoning || undefined,
      confidence: 0.8, // High confidence since computed from actual data
    };
  }

  /**
   * Apply recommendations (save to localStorage for intent form)
   */
  async applyRecommendations(recs: TradingRecommendations): Promise<void> {
    // Store in localStorage for the intent form to use
    localStorage.setItem('moneypenny_applied_config', JSON.stringify(recs));
  }

  /**
   * Get current policy from localStorage
   */
  async getCurrentPolicy(): Promise<TradingRecommendations | null> {
    const stored = localStorage.getItem('moneypenny_applied_config');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Update policy in Supabase database
   */
  async updatePolicy(policy: Partial<TradingRecommendations>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const current = await this.getRecommendations();
    const updated = { ...current, ...policy };

    const { error } = await supabase
      .from('trading_recommendations')
      .upsert({
        user_id: user.id,
        inventory_min: updated.inventory_band.min_qc,
        inventory_max: updated.inventory_band.max_qc,
        min_edge_bps: updated.min_edge_bps_baseline,
        daily_loss_limit_bps: updated.daily_loss_limit_bps,
        max_notional_usd: updated.max_notional_usd_day,
        reasoning: updated.reasoning,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating policy:', error);
      throw error;
    }
  }

  /**
   * Trigger re-parsing of all uploaded bank statements
   */
  async recomputeAggregates(): Promise<{ job_id: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get all user's statements
    const { data: statements, error } = await supabase
      .from('bank_statements')
      .select('file_path')
      .eq('user_id', user.id);

    if (error || !statements || statements.length === 0) {
      throw new Error('No bank statements found to recompute');
    }

    const filePaths = statements.map(s => s.file_path);

    // Call the parser function
    const { error: funcError } = await supabase.functions.invoke('banking-document-parser', {
      body: {
        file_paths: filePaths,
        user_id: user.id,
      },
    });

    if (funcError) {
      console.error('Error recomputing aggregates:', funcError);
      throw funcError;
    }

    return { job_id: crypto.randomUUID() };
  }

  /**
   * Get computation status (simplified - always returns completed since processing is synchronous)
   */
  async getComputationStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: FinancialAggregate;
  }> {
    // Since we process synchronously in the edge function, just return current aggregates
    const result = await this.getAggregates();
    return {
      status: 'completed',
      progress: 100,
      result,
    };
  }
}
