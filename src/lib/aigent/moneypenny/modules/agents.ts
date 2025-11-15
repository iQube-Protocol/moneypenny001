/**
 * Agents Module
 * MoneyPenny (trading) + Kn0w1 (education) with Tavily integration
 */

import { MoneyPennyClient } from '../client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface MoneyPennyResponse {
  answer: string;
  sources: string[]; // e.g., ["memories", "aggregates", "tavily:coingecko"]
  memory_used: boolean;
  aggregate_used: boolean;
  excerpt_used: boolean;
  tavily_used: boolean;
  insights: string[]; // New insights to be stored
  confidence?: number;
}

export interface Know1Response {
  answer: string;
  citations: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  educational: boolean;
}

export interface MetaAvatarScript {
  script: string;
  video_url?: string;
  duration_sec?: number;
  voice_id?: string;
}

export class AgentsModule {
  constructor(private client: MoneyPennyClient) {}

  // === MoneyPenny: Trading/Payments/Fees Agent ===

  async askMoneyPenny(
    question: string,
    history: ChatMessage[],
    enableExcerpts: boolean = false
  ): Promise<MoneyPennyResponse> {
    const config = this.client.getConfig();

    // Tool order: memories → aggregates → excerpts (if consent) → tavily
    const response = await this.client['fetch']<MoneyPennyResponse>(
      `${config.agentsUrl}/chat/moneypenny/answer`,
      {
        method: 'POST',
        body: JSON.stringify({
          question,
          history,
          enable_excerpts: enableExcerpts,
          enable_tavily: !!this.client.tavily,
          privacy_mode: config.venicePrivacyMode,
        }),
      }
    );

    // Store insights as memories
    if (response.insights && response.insights.length > 0) {
      for (const insight of response.insights) {
        try {
          await this.client.memories.appendInsight(
            insight,
            'moneypenny',
            response.aggregate_used ? 'aggregate_link' : undefined
          );
        } catch (error) {
          console.error('Failed to store insight:', error);
        }
      }
    }

    // Cache in Redis if available
    if (this.client.redis) {
      try {
        await this.client.redis.cache(
          `chat:moneypenny:${Date.now()}`,
          { question, response },
          300 // 5 min TTL
        );
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    return response;
  }

  // MoneyPenny with Tavily (live web search)
  async askMoneyPennyWithWeb(
    question: string,
    history: ChatMessage[]
  ): Promise<MoneyPennyResponse> {
    // Pre-fetch relevant web data if Tavily is available
    if (this.client.tavily) {
      try {
        const searchResults = await this.client.tavily.search({
          query: question,
          maxResults: 3,
          searchDepth: 'basic',
        });

        // Add web context to history
        if (searchResults.length > 0) {
          const webContext = searchResults
            .map(r => `[${r.title}](${r.url}): ${r.content.slice(0, 200)}`)
            .join('\n\n');

          history.push({
            role: 'assistant',
            content: `Here's recent web data:\n${webContext}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Tavily search error:', error);
      }
    }

    return this.askMoneyPenny(question, history, false);
  }

  // === Kn0w1: Educational/Entertainment Agent ===

  async askKnow1(query: string): Promise<Know1Response> {
    const config = this.client.getConfig();

    const response = await this.client['fetch']<Know1Response>(
      `${config.agentsUrl}/chat/know1/answer`,
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          enable_tavily: !!this.client.tavily,
          privacy_mode: config.venicePrivacyMode,
        }),
      }
    );

    // Cache in Redis if available
    if (this.client.redis) {
      try {
        await this.client.redis.cache(
          `chat:know1:${Date.now()}`,
          { query, response },
          300
        );
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    return response;
  }

  // Kn0w1 with Tavily (live web search)
  async askKnow1WithWeb(query: string): Promise<Know1Response> {
    let citations: Know1Response['citations'] = [];

    // Fetch live web data with Tavily
    if (this.client.tavily) {
      try {
        const searchResults = await this.client.tavily.search({
          query,
          maxResults: 5,
          searchDepth: 'advanced',
        });

        citations = searchResults.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 200),
        }));
      } catch (error) {
        console.error('Tavily search error:', error);
      }
    }

    // Get Kn0w1 response
    const response = await this.askKnow1(query);

    // Merge citations
    response.citations = [...response.citations, ...citations];

    return response;
  }

  // === MetaAvatar: Context-Aware Scripts ===

  async getMetaAvatarScript(
    page: 'console' | 'profile' | 'persona' | 'welcome',
    userState?: any
  ): Promise<MetaAvatarScript> {
    const config = this.client.getConfig();

    return this.client['fetch'](`${config.agentsUrl}/metavatar/script`, {
      method: 'POST',
      body: JSON.stringify({ page, user_state: userState }),
    });
  }

  // === Chat History Management ===

  async getChatHistory(agentType: 'moneypenny' | 'know1', limit: number = 50): Promise<ChatMessage[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();

    if (!scope) return [];

    return this.client['fetch'](
      `${config.agentsUrl}/chat/${agentType}/history?scope=${scope}&limit=${limit}`
    );
  }

  async clearChatHistory(agentType: 'moneypenny' | 'know1'): Promise<void> {
    const config = this.client.getConfig();

    await this.client['fetch'](`${config.agentsUrl}/chat/${agentType}/clear`, {
      method: 'POST',
    });
  }
}
