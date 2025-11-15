/**
 * DVN Anchors Module
 * Proof-of-State anchors for consequential writes
 */

import { MoneyPennyClient } from '../client';

export interface ProofOfStateAnchor {
  anchor_id: string;
  kind: 'identity' | 'payment' | 'trade' | 'memory' | 'document';
  hash: string;
  refs: {
    metaQube?: string;
    tokenQube?: string;
    claimId?: string;
    personaDid?: string;
    [key: string]: any;
  };
  timestamp: string;
  dvn_verified: boolean;
  verification_count?: number;
}

export class AnchorsModule {
  constructor(private client: MoneyPennyClient) {}

  // Emit new anchor
  async emitAnchor(
    kind: ProofOfStateAnchor['kind'],
    hash: string,
    refs: ProofOfStateAnchor['refs']
  ): Promise<{ ok: boolean; anchor_id: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.dvnUrl}/anchors/emit`, {
      method: 'POST',
      body: JSON.stringify({ kind, hash, refs }),
    });
  }

  // Get anchor by ID
  async getAnchor(anchorId: string): Promise<ProofOfStateAnchor> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.dvnUrl}/anchors/${anchorId}`);
  }

  // List anchors
  async listAnchors(
    kind?: ProofOfStateAnchor['kind'],
    limit: number = 20
  ): Promise<ProofOfStateAnchor[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    const kindParam = kind ? `&kind=${kind}` : '';
    return this.client['fetch'](
      `${config.dvnUrl}/anchors?scope=${scope}&limit=${limit}${kindParam}`
    );
  }

  // Verify anchor
  async verifyAnchor(anchorId: string): Promise<{
    verified: boolean;
    verification_count: number;
    dvn_consensus: boolean;
  }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.dvnUrl}/anchors/${anchorId}/verify`);
  }

  // Get anchors for specific entity
  async getAnchorsForEntity(entityType: string, entityId: string): Promise<ProofOfStateAnchor[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.dvnUrl}/anchors/entity?type=${entityType}&id=${entityId}`
    );
  }

  // Get anchor history (timeline)
  async getAnchorHistory(startDate?: string, endDate?: string): Promise<ProofOfStateAnchor[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    const params = new URLSearchParams({ scope });
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    return this.client['fetch'](`${config.dvnUrl}/anchors/history?${params.toString()}`);
  }

  // Helper: Emit identity anchor
  async emitIdentityAnchor(personaDid: string, action: string): Promise<string> {
    const hash = await this.hashString(`${personaDid}:${action}:${Date.now()}`);
    const result = await this.emitAnchor('identity', hash, { personaDid, action });
    return result.anchor_id;
  }

  // Helper: Emit payment anchor
  async emitPaymentAnchor(claimId: string, txHash: string): Promise<string> {
    const hash = await this.hashString(`${claimId}:${txHash}`);
    const result = await this.emitAnchor('payment', hash, { claimId, txHash });
    return result.anchor_id;
  }

  // Helper: Emit trade anchor
  async emitTradeAnchor(tradeId: string, details: any): Promise<string> {
    const hash = await this.hashString(JSON.stringify({ tradeId, ...details }));
    const result = await this.emitAnchor('trade', hash, { tradeId, ...details });
    return result.anchor_id;
  }

  // Hash utility
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
