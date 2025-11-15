/**
 * FIO Module
 * FIO/Theo human-readable handles for crypto addresses
 */

import { MoneyPennyClient } from '../client';

export interface FIOHandle {
  fio_address: string; // e.g., "aigentz@aigent"
  persona_did?: string;
  wallet_addresses: Array<{
    chain: string;
    address: string;
    verified: boolean;
  }>;
  created_at: string;
  expires_at?: string;
}

export interface FIORequest {
  request_id: string;
  from_fio: string;
  to_fio: string;
  amount: number;
  asset: string;
  memo?: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
}

export class FIOModule {
  constructor(private client: MoneyPennyClient) {}

  // Register new FIO handle
  async registerHandle(handle: string, domain: string = 'aigent'): Promise<FIOHandle> {
    const config = this.client.getConfig();
    
    const fioAddress = `${handle}@${domain}`;
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/fio/register`, {
      method: 'POST',
      body: JSON.stringify({ fio_address: fioAddress }),
    });
  }

  // Resolve FIO handle to addresses
  async resolveHandle(fioAddress: string): Promise<FIOHandle> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/fio/resolve?fio=${encodeURIComponent(fioAddress)}`
    );
  }

  // Link wallet address to FIO handle
  async linkWallet(chain: string, address: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.apiBaseUrl}/a2a/fio/link_wallet`, {
      method: 'POST',
      body: JSON.stringify({ chain, address }),
    });
  }

  // Remove wallet address from FIO handle
  async unlinkWallet(chain: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.apiBaseUrl}/a2a/fio/unlink_wallet`, {
      method: 'POST',
      body: JSON.stringify({ chain }),
    });
  }

  // Get my FIO handle
  async getMyHandle(): Promise<FIOHandle | null> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return null;

    try {
      return await this.client['fetch'](
        `${config.apiBaseUrl}/a2a/fio/my_handle?persona=${scope}`
      );
    } catch (error) {
      console.error('Get my handle error:', error);
      return null;
    }
  }

  // Create payment request
  async createPaymentRequest(
    toFio: string,
    amount: number,
    asset: string,
    memo?: string
  ): Promise<FIORequest> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.apiBaseUrl}/a2a/fio/request`, {
      method: 'POST',
      body: JSON.stringify({
        to_fio: toFio,
        amount,
        asset,
        memo,
      }),
    });
  }

  // List payment requests (sent and received)
  async listPaymentRequests(type: 'sent' | 'received' = 'received'): Promise<FIORequest[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/fio/requests?scope=${scope}&type=${type}`
    );
  }

  // Respond to payment request
  async respondToRequest(
    requestId: string,
    action: 'pay' | 'reject',
    txHash?: string
  ): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.apiBaseUrl}/a2a/fio/requests/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ action, tx_hash: txHash }),
    });
  }

  // Check handle availability
  async checkAvailability(handle: string, domain: string = 'aigent'): Promise<{
    available: boolean;
    fio_address: string;
  }> {
    const config = this.client.getConfig();
    const fioAddress = `${handle}@${domain}`;
    
    return this.client['fetch'](
      `${config.apiBaseUrl}/a2a/fio/check?fio=${encodeURIComponent(fioAddress)}`,
      { skipAuth: true }
    );
  }
}
