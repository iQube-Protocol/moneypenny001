/**
 * Smart Memories Module
 * Context summaries + insights/decisions (future iQubeable persona memories)
 */

import { MoneyPennyClient } from '../client';

export interface Memory {
  id: string;
  type: 'profile' | 'trade' | 'daily_summary' | 'glossary' | 'preference' | 'insight' | 'decision';
  content: string;
  metadata?: {
    source?: string; // e.g., "tavily", "aggregate", "user_input", "moneypenny"
    aggregate_link?: string; // Link to aggregate DataQube
    anchor_id?: string; // DVN anchor reference
    future_iqubeable?: boolean; // Flag for persona memory system
    confidence?: number;
    tags?: string[];
    [key: string]: any;
  };
  created_at: string;
}

export interface MemorySearchResult {
  memories: Memory[];
  relevance_scores: number[];
}

export interface MemoryPreferences {
  doc_level_excerpts: boolean; // Consent for redacted excerpts
  auto_insights: boolean; // Auto-capture insights
  retention_days?: number;
}

export class MemoriesModule {
  constructor(private client: MoneyPennyClient) {}

  // Append new memory
  async append(
    type: Memory['type'],
    content: string,
    metadata?: Memory['metadata']
  ): Promise<Memory> {
    const config = this.client.getConfig();

    // Emit DVN anchor for consequential memories
    if (['insight', 'decision'].includes(type)) {
      try {
        const hash = await this.hashContent(content);
        const anchor = await this.client.anchors.emitAnchor('memory', hash, {
          personaDid: this.client.getPersonaDid() || undefined,
        });
        metadata = { ...metadata, anchor_id: anchor.anchor_id };
      } catch (error) {
        console.error('DVN anchor error:', error);
      }
    }

    return this.client['fetch'](`${config.memoriesUrl}/append`, {
      method: 'POST',
      body: JSON.stringify({ type, content, metadata }),
    });
  }

  // Search memories by query
  async search(query: string, limit: number = 5): Promise<MemorySearchResult> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.memoriesUrl}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  // Get memories by type
  async getByType(type: Memory['type'], limit: number = 20): Promise<Memory[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.memoriesUrl}/by-type?scope=${scope}&type=${type}&limit=${limit}`
    );
  }

  // Get recent memories
  async getRecent(limit: number = 20): Promise<Memory[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](
      `${config.memoriesUrl}/recent?scope=${scope}&limit=${limit}`
    );
  }

  // Get preferences
  async getPreferences(): Promise<MemoryPreferences> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      return {
        doc_level_excerpts: false,
        auto_insights: true,
      };
    }

    return this.client['fetch'](`${config.memoriesUrl}/prefs?scope=${scope}`);
  }

  // Update preferences
  async updatePreferences(prefs: Partial<MemoryPreferences>): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.memoriesUrl}/prefs`, {
      method: 'POST',
      body: JSON.stringify(prefs),
    });
  }

  // Delete memory
  async deleteMemory(memoryId: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.memoriesUrl}/${memoryId}`, {
      method: 'DELETE',
    });
  }

  // Clear memories by type
  async clearByType(type: Memory['type']): Promise<{ deleted_count: number }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.memoriesUrl}/clear`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  // Export memories (for iQube migration)
  async exportMemories(): Promise<{ export_url: string; expires_at: string }> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) {
      throw new Error('No scope available');
    }

    return this.client['fetch'](`${config.memoriesUrl}/export?scope=${scope}`, {
      method: 'POST',
    });
  }

  // Hash content for DVN anchors
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Helper: Append insight from agent
  async appendInsight(
    insight: string,
    source: string,
    aggregateLink?: string
  ): Promise<Memory> {
    return this.append('insight', insight, {
      source,
      aggregate_link: aggregateLink,
      future_iqubeable: true,
    });
  }

  // Helper: Append decision
  async appendDecision(
    decision: string,
    reasoning: string,
    source: string
  ): Promise<Memory> {
    return this.append('decision', `${decision}\n\nReasoning: ${reasoning}`, {
      source,
      future_iqubeable: true,
    });
  }
}
