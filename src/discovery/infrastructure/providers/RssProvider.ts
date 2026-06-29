import Parser from 'rss-parser';
import { DiscoverySource, type FetchParams, type IDiscoveryProvider, type RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { ILogger } from '../../../shared/logger/ILogger';
import { ProviderError } from '../../../shared/errors/AppError';

export interface RssProviderConfig {
  feedUrls: string[];
  requestTimeoutMs?: number;
}

export class RssProvider implements IDiscoveryProvider {
  readonly name = 'rss';
  readonly source = DiscoverySource.RSS;

  private readonly parser: Parser;

  constructor(
    private readonly config: RssProviderConfig,
    private readonly logger: ILogger,
  ) {
    this.parser = new Parser({
      timeout: config.requestTimeoutMs ?? 10_000,
      customFields: {
        item: ['author', 'dc:creator'],
      },
    });
  }

  isConfigured(): boolean {
    return this.config.feedUrls.length > 0;
  }

  async fetchOpportunities(params: FetchParams): Promise<RawOpportunity[]> {
    if (!this.isConfigured()) {
      this.logger.warn('RssProvider has no feed URLs configured');
      return [];
    }

    const limit = params.limit ?? 50;
    const results: RawOpportunity[] = [];

    for (const url of this.config.feedUrls) {
      try {
        const raw = await this.fetchFeed(url, params, limit);
        results.push(...raw);
      } catch (error) {
        this.logger.error({ url, error }, 'Failed to fetch RSS feed');
      }
    }

    return results;
  }

  private async fetchFeed(
    url: string,
    params: FetchParams,
    limit: number,
  ): Promise<RawOpportunity[]> {
    let feed: Parser.Output<Record<string, unknown>>;
    try {
      feed = await this.parser.parseURL(url);
    } catch (cause) {
      throw new ProviderError(
        `Failed to parse RSS feed at ${url}: ${String(cause)}`,
        this.name,
      );
    }

    const results: RawOpportunity[] = [];

    for (const item of feed.items.slice(0, limit)) {
      const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

      if (params.since !== undefined && publishedAt !== null && publishedAt < params.since) {
        continue;
      }

      const author =
        typeof item['dc:creator'] === 'string'
          ? item['dc:creator']
          : typeof item['creator'] === 'string'
            ? item['creator']
            : undefined;

      results.push({
        title: typeof item.title === 'string' ? item.title : '',
        summary: typeof item.contentSnippet === 'string'
          ? item.contentSnippet
          : typeof item.content === 'string'
            ? item.content
            : '',
        url: typeof item.link === 'string' ? item.link : url,
        publishedAt,
        ...(author !== undefined ? { author } : {}),
        metadata: {
          feedUrl: url,
          feedTitle: feed.title ?? '',
          guid: typeof item.guid === 'string' ? item.guid : null,
          categories: Array.isArray(item.categories) ? item.categories : [],
        },
      });
    }

    this.logger.debug(
      { feedUrl: url, parsed: results.length },
      'RSS feed parsed',
    );

    return results;
  }
}
