/**
 * Core AgentiQ Platform Types
 * Shared across all agent classes (MoneyPenny, Nakamoto, Kn0w1)
 */

export interface AgentiQConfig {
  // Base URLs for AgentiQ services
  apiBaseUrl: string;
  didQubeUrl: string;
  blakQubeUrl: string;
  metaQubeUrl: string;
  aggregateUrl: string;
  memoriesUrl: string;
  quotesUrl: string;
  executionUrl: string;
  oracleUrl: string;
  agentsUrl: string;
  dvnUrl: string;
  
  // Feature flags
  enableA2A: boolean;
  enableMetaMask: boolean;
  enableUniSat: boolean;
  enablePhantom: boolean;
  enableNonEVM: boolean;
  
  // External services (optional)
  tavilyApiKey?: string;
  redisUrl?: string;
  
  // Agent settings
  venicePrivacyMode: 'strict' | 'moderate';
  oraclePollIntervalMs: number;
  
  // Agent class metadata
  agentClass: 'moneypenny' | 'nakamoto' | 'know1';
  tenantId?: string;
}

export interface StreamOptions {
  onMessage: (data: any) => void;
  onError?: (error: any) => void;
}

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}
