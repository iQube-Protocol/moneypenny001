/**
 * AgentiQ Configuration Factory
 * Creates configuration objects from environment variables
 */

import { AgentiQConfig } from './types';

export function createConfigFromEnv(): AgentiQConfig {
  return {
    // Base URLs
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.aigent.dev',
    didQubeUrl: import.meta.env.VITE_DIDQUBE_URL || 'https://did.aigent.dev',
    blakQubeUrl: import.meta.env.VITE_BLAKQUBE_URL || 'https://blak.aigent.dev',
    metaQubeUrl: import.meta.env.VITE_METAQUBE_URL || 'https://meta.aigent.dev',
    aggregateUrl: import.meta.env.VITE_AGGREGATE_URL || 'https://aggregate.aigent.dev',
    memoriesUrl: import.meta.env.VITE_MEMORIES_URL || 'https://memories.aigent.dev',
    quotesUrl: import.meta.env.VITE_QUOTES_URL || 'https://quotes.aigent.dev',
    executionUrl: import.meta.env.VITE_EXECUTION_URL || 'https://execution.aigent.dev',
    oracleUrl: import.meta.env.VITE_ORACLE_URL || 'https://oracle.aigent.dev',
    agentsUrl: import.meta.env.VITE_AGENTS_URL || 'https://agents.aigent.dev',
    dvnUrl: import.meta.env.VITE_DVN_URL || 'https://dvn.aigent.dev',

    // Feature flags
    enableA2A: import.meta.env.VITE_ENABLE_A2A === 'true',
    enableMetaMask: import.meta.env.VITE_ENABLE_METAMASK !== 'false', // Default true
    enableUniSat: import.meta.env.VITE_ENABLE_UNISAT === 'true',
    enablePhantom: import.meta.env.VITE_ENABLE_PHANTOM === 'true',
    enableNonEVM: import.meta.env.VITE_ENABLE_NON_EVM === 'true',

    // External services (optional)
    tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY,
    redisUrl: import.meta.env.VITE_REDIS_URL,

    // Agent settings
    venicePrivacyMode: (import.meta.env.VITE_VENICE_PRIVACY_MODE as 'strict' | 'moderate') || 'strict',
    oraclePollIntervalMs: parseInt(import.meta.env.VITE_ORACLE_POLL_INTERVAL_MS || '30000'),

    // Agent class metadata
    agentClass: (import.meta.env.VITE_AGENT_CLASS as 'moneypenny' | 'nakamoto' | 'know1') || 'moneypenny',
    tenantId: import.meta.env.VITE_TENANT_ID,
  };
}

export function validateConfig(config: AgentiQConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required URLs
  if (!config.apiBaseUrl) errors.push('apiBaseUrl is required');
  if (!config.didQubeUrl) errors.push('didQubeUrl is required');

  // Validate at least one auth method enabled
  if (!config.enableA2A && !config.enableMetaMask && !config.enableUniSat && !config.enablePhantom) {
    errors.push('At least one authentication method must be enabled');
  }

  // Validate agent class
  if (!['moneypenny', 'nakamoto', 'know1'].includes(config.agentClass)) {
    errors.push('Invalid agent class');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
