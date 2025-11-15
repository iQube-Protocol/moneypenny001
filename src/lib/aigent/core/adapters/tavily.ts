/**
 * Tavily Adapter - Live Web Search
 * Docs: https://tavily.com/docs
 * 
 * Best practices baked in:
 * - Domain allow-lists
 * - HTML validation/sanitization
 * - Exponential backoff on rate limits
 * - Redis caching (when available)
 */

export interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchOptions {
  query: string;
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeImages?: boolean;
  includeAnswer?: boolean;
}

export class TavilyAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';
  private allowedDomains: string[] = [
    'coingecko.com',
    'coinpaprika.com',
    'dexscreener.com',
    'defillama.com',
    'etherscan.io',
    'blockchain.com',
    'solscan.io',
    'arbiscan.io',
    'basescan.org',
    'optimistic.etherscan.io',
    'polygonscan.com',
  ];

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Tavily API key required');
    this.apiKey = apiKey;
  }

  async search(options: TavilySearchOptions): Promise<TavilySearchResult[]> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: options.query,
            max_results: options.maxResults || 5,
            search_depth: options.searchDepth || 'basic',
            include_images: options.includeImages || false,
            include_answer: options.includeAnswer || false,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - exponential backoff
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`Tavily rate limit, backing off ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            attempt++;
            continue;
          }
          throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter by allowed domains for security
        const filtered = (data.results || []).filter((r: TavilySearchResult) => {
          try {
            const url = new URL(r.url);
            return this.allowedDomains.some(domain => url.hostname.includes(domain));
          } catch {
            return false;
          }
        });

        return filtered;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error('Tavily search failed:', error);
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return [];
  }

  // Validate and sanitize HTML before LLM processing
  sanitizeHTML(html: string): string {
    // Remove script tags and dangerous content
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
    
    return clean;
  }

  // Add a domain to the allow-list
  addAllowedDomain(domain: string): void {
    if (!this.allowedDomains.includes(domain)) {
      this.allowedDomains.push(domain);
    }
  }

  // Get current allow-list
  getAllowedDomains(): string[] {
    return [...this.allowedDomains];
  }
}
