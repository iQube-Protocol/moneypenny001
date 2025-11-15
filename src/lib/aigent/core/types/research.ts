/**
 * Research Agent Types with iQube Risk/Trust Scoring
 */

export type IQubeTier = 'anonymous' | 'persona' | 'root' | 'kybe';

export interface IQubeRiskTrust {
  iq_risk_score: number;   // 0-100, higher = higher risk
  iq_trust_score: number;  // 0-100, higher = more trusted
  iq_tier: IQubeTier;
  tags?: string[];
}

export interface Citation {
  title: string;
  url: string;
  snippet?: string;
  published_date?: string;
}

export interface ResearchMemo extends IQubeRiskTrust {
  id: string;
  scope: string;
  topic: string;
  summary: string;
  bullets: string[];
  citations: Citation[];
  created_at: string;
}

export interface ResearchRequest {
  topic: string;
  scope?: string;
  maxResults?: number;
}

export interface ResearchResponse {
  memo: ResearchMemo;
  cached: boolean;
}
