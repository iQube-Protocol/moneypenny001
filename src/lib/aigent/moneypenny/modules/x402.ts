/**
 * X402 Module
 * Payment settlements with 3 types: remote custody, deferred minting, canonical minting
 */

import { MoneyPennyClient } from '../client';

export type SettlementType = 'remote_custody' | 'deferred_minting' | 'canonical_minting';

export interface X402Claim {
  claim_id: string;
  status: 'pending' | 'settled' | 'redeemed' | 'expired';
  amount: number;
  asset: string;
  created_at: string;
  expires_at: string;
  settlement_type: SettlementType;
  chain?: string;
}

export interface X402RemoteCustody {
  escrow_id: string;
  status: 'open' | 'closed';
  balance: number;
  asset: string;
  chain: string;
  opened_at: string;
}

export interface X402Fees {
  network_fee: number;
  service_fee: number;
  total: number;
  estimated_time_sec: number;
}

export class X402Module {
  constructor(private client: MoneyPennyClient) {}

  // === Claims Lifecycle ===

  // Create claim with settlement type
  async createClaim(
    amount: number,
    asset: string,
    settlementType: SettlementType,
    chain?: string
  ): Promise<X402Claim> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/claim.create`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        asset,
        settlement_type: settlementType,
        chain,
      }),
    });
  }

  // Redeem claim
  async redeemClaim(claimId: string): Promise<{ tx_hash: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/claim.redeem`, {
      method: 'POST',
      body: JSON.stringify({ claim_id: claimId }),
    });
  }

  // Settle claim
  async settleClaim(claimId: string): Promise<{ settled: boolean; tx_hash?: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/settle`, {
      method: 'POST',
      body: JSON.stringify({ claim_id: claimId }),
    });
  }

  // List claims
  async listClaims(status?: X402Claim['status']): Promise<X402Claim[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    const statusParam = status ? `&status=${status}` : '';
    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/x402/claims?scope=${scope}${statusParam}`
    );
  }

  // Get claim details
  async getClaim(claimId: string): Promise<X402Claim> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/claims/${claimId}`);
  }

  // === Remote Custody (Settlement Type 1) ===

  // Open remote custody escrow
  async openRemoteCustody(
    amount: number,
    asset: string,
    chain: string
  ): Promise<X402RemoteCustody> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/remote_custody.open`, {
      method: 'POST',
      body: JSON.stringify({ amount, asset, chain }),
    });
  }

  // Close remote custody escrow
  async closeRemoteCustody(escrowId: string): Promise<{ closed: boolean; tx_hash?: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/remote_custody.close`, {
      method: 'POST',
      body: JSON.stringify({ escrow_id: escrowId }),
    });
  }

  // List remote custody accounts
  async listRemoteCustody(): Promise<X402RemoteCustody[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/x402/remote_custody?scope=${scope}`
    );
  }

  // === Deferred Minting (Settlement Type 2) ===

  // Create deferred minting intent
  async deferredMint(
    amount: number,
    asset: string,
    chain: string
  ): Promise<{ deferred_id: string; estimated_settlement: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/deferred_mint`, {
      method: 'POST',
      body: JSON.stringify({ amount, asset, chain }),
    });
  }

  // Get deferred minting status
  async getDeferredMintStatus(deferredId: string): Promise<{
    status: 'pending' | 'minting' | 'completed' | 'failed';
    tx_hash?: string;
  }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/x402/deferred_mint/${deferredId}`
    );
  }

  // === Canonical Minting (Settlement Type 3 - Immediate) ===

  // Execute canonical minting (immediate settlement)
  async canonicalMint(
    amount: number,
    asset: string,
    chain: string
  ): Promise<{ tx_hash: string; block_number?: number }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/x402/canonical_mint`, {
      method: 'POST',
      body: JSON.stringify({ amount, asset, chain }),
    });
  }

  // === Fees ===

  // Preview fees for settlement
  async previewFees(
    amount: number,
    asset: string,
    settlementType: SettlementType,
    chain?: string
  ): Promise<X402Fees> {
    const config = this.client.getConfig();
    
    const params = new URLSearchParams({
      amount: amount.toString(),
      asset,
      type: settlementType,
    });
    
    if (chain) params.append('chain', chain);

    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/x402/fees.preview?${params.toString()}`
    );
  }

  // === Transaction History ===

  // Get transaction history
  async getTransactionHistory(limit: number = 50): Promise<any[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/x402/history?scope=${scope}&limit=${limit}`
    );
  }
}
