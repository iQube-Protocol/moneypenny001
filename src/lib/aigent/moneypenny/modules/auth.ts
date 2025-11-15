/**
 * Auth Module
 * DiDQube personas + wallet fallback authentication
 */

import { MoneyPennyClient } from '../client';

export interface PersonaDid {
  did: string;
  handle: string;
  display_name?: string;
  avatar?: string;
  kybed_id: string;
  root_did: string;
  created_at: string;
}

export interface AuthChallenge {
  challenge: string;
  expires_at: string;
}

export interface AuthSession {
  token: string;
  persona_did: string;
  fio_handle?: string;
  expires_at: string;
}

export interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  issuance_date: string;
  credential_subject: any;
  proof?: any;
}

export class AuthModule {
  constructor(private client: MoneyPennyClient) {}

  // DiDQube: Create new persona
  async createPersona(handle: string, displayName?: string): Promise<PersonaDid> {
    const config = this.client.getConfig();
    
    return this.client['fetch']<PersonaDid>(`${config.didQubeUrl}/persona/create`, {
      method: 'POST',
      body: JSON.stringify({ handle, display_name: displayName }),
    });
  }

  // DiDQube: Request authentication challenge
  async requestChallenge(did: string): Promise<AuthChallenge> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.didQubeUrl}/auth/challenge`, {
      method: 'POST',
      body: JSON.stringify({ did }),
      skipAuth: true,
    });
  }

  // DiDQube: Verify challenge and get session token
  async verifyChallenge(did: string, signature: string): Promise<AuthSession> {
    const config = this.client.getConfig();
    
    const session = await this.client['fetch']<AuthSession>(
      `${config.didQubeUrl}/auth/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ did, signature }),
        skipAuth: true,
      }
    );

    // Set auth state in client
    this.client.setPersonaDid(session.persona_did);
    this.client.setAuthToken(session.token);

    return session;
  }

  // DiDQube: Sign in with persona (complete flow)
  async signInWithPersona(did: string): Promise<AuthSession> {
    // Step 1: Request challenge
    const challenge = await this.requestChallenge(did);

    // Step 2: Sign challenge (in real implementation, this would use X402 wallet)
    // For now, simulated
    const signature = `signed_${challenge.challenge}`;

    // Step 3: Verify and get token
    return this.verifyChallenge(did, signature);
  }

  // DiDQube: Link wallet to persona
  async linkWallet(walletAddress: string, chainId: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.didQubeUrl}/persona/link-wallet`, {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress, chain_id: chainId }),
    });
  }

  // DiDQube: Rotate root DID (security feature)
  async rotateRootDid(): Promise<{ new_root_did: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.didQubeUrl}/persona/rotate-root`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // DiDQube: List verifiable credentials
  async listCredentials(): Promise<VerifiableCredential[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      return [];
    }

    return this.client['fetch'](`${config.didQubeUrl}/vc/list?scope=${scope}`);
  }

  // DiDQube: Get persona details
  async getPersona(did?: string): Promise<PersonaDid> {
    const config = this.client.getConfig();
    const targetDid = did || this.client.getPersonaDid();
    
    if (!targetDid) {
      throw new Error('No persona DID provided or set');
    }

    return this.client['fetch'](`${config.didQubeUrl}/persona/${targetDid}`);
  }

  // Sign out
  async signOut(): Promise<void> {
    const config = this.client.getConfig();
    
    try {
      await this.client['fetch'](`${config.didQubeUrl}/auth/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local state
    this.client.setAuthToken(null);
    this.client.setPersonaDid(null);
    this.client.setWalletAdapter(null);
  }
}
