import Parser from 'rss-parser';
import { RssProvider } from '../../../../src/discovery/infrastructure/providers/RssProvider';
import type { ILogger } from '../../../../src/shared/logger/ILogger';
import { DiscoverySource } from '../../../../src/discovery/domain/providers/IDiscoveryProvider';

jest.mock('rss-parser');

const MockedParser = jest.mocked(Parser);

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeFeedItem(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    title: 'TypeScript 5.4 Released',
    link: 'https://devblog.example.com/ts-5-4',
    pubDate: 'Mon, 01 Jan 2024 10:00:00 GMT',
    contentSnippet: 'TypeScript 5.4 brings exciting new features.',
    guid: 'guid-001',
    categories: ['typescript', 'javascript'],
    ...overrides,
  };
}

describe('RssProvider', () => {
  let logger: jest.Mocked<ILogger>;
  let mockParseURL: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    mockParseURL = jest.fn();
    MockedParser.prototype.parseURL = mockParseURL;
  });

  describe('isConfigured', () => {
    it('returns true when feedUrls are provided', () => {
      const provider = new RssProvider({ feedUrls: ['https://example.com/feed'] }, logger);
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns false when feedUrls is empty', () => {
      const provider = new RssProvider({ feedUrls: [] }, logger);
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe('name and source', () => {
    it('has correct name and source', () => {
      const provider = new RssProvider({ feedUrls: ['https://example.com/feed'] }, logger);
      expect(provider.name).toBe('rss');
      expect(provider.source).toBe(DiscoverySource.RSS);
    });
  });

  describe('fetchOpportunities', () => {
    it('returns empty array and logs warning when not configured', async () => {
      const provider = new RssProvider({ feedUrls: [] }, logger);
      const results = await provider.fetchOpportunities({});

      expect(results).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
      expect(mockParseURL).not.toHaveBeenCalled();
    });

    it('fetches and maps items from a single feed', async () => {
      mockParseURL.mockResolvedValue({
        title: 'Dev Blog',
        items: [makeFeedItem()],
      });

      const provider = new RssProvider(
        { feedUrls: ['https://devblog.example.com/feed'] },
        logger,
      );

      const results = await provider.fetchOpportunities({});

      expect(results).toHaveLength(1);
      const item = results[0]!;
      expect(item.title).toBe('TypeScript 5.4 Released');
      expect(item.url).toBe('https://devblog.example.com/ts-5-4');
      expect(item.publishedAt).toBeInstanceOf(Date);
      expect(item.summary).toContain('TypeScript 5.4');
    });

    it('merges results from multiple feeds', async () => {
      mockParseURL
        .mockResolvedValueOnce({ title: 'Feed A', items: [makeFeedItem({ title: 'Article A' })] })
        .mockResolvedValueOnce({ title: 'Feed B', items: [makeFeedItem({ title: 'Article B' })] });

      const provider = new RssProvider(
        { feedUrls: ['https://feed-a.com/rss', 'https://feed-b.com/rss'] },
        logger,
      );

      const results = await provider.fetchOpportunities({});

      expect(results).toHaveLength(2);
      expect(results.map(r => r.title)).toEqual(
        expect.arrayContaining(['Article A', 'Article B']),
      );
    });

    it('respects the limit parameter', async () => {
      const items = Array.from({ length: 20 }, (_, i) =>
        makeFeedItem({ title: `Article ${i}`, guid: `guid-${i}` }),
      );
      mockParseURL.mockResolvedValue({ title: 'Feed', items });

      const provider = new RssProvider(
        { feedUrls: ['https://example.com/feed'] },
        logger,
      );

      const results = await provider.fetchOpportunities({ limit: 5 });

      expect(results).toHaveLength(5);
    });

    it('filters out items older than `since`', async () => {
      const oldDate = 'Mon, 01 Jan 2020 00:00:00 GMT';
      const newDate = 'Mon, 01 Jan 2024 00:00:00 GMT';

      mockParseURL.mockResolvedValue({
        title: 'Feed',
        items: [
          makeFeedItem({ title: 'Old Article', pubDate: oldDate }),
          makeFeedItem({ title: 'New Article', pubDate: newDate }),
        ],
      });

      const provider = new RssProvider(
        { feedUrls: ['https://example.com/feed'] },
        logger,
      );

      const since = new Date('2023-01-01T00:00:00Z');
      const results = await provider.fetchOpportunities({ since });

      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe('New Article');
    });

    it('sets publishedAt to null when pubDate is absent', async () => {
      mockParseURL.mockResolvedValue({
        title: 'Feed',
        items: [makeFeedItem({ pubDate: undefined })],
      });

      const provider = new RssProvider(
        { feedUrls: ['https://example.com/feed'] },
        logger,
      );

      const results = await provider.fetchOpportunities({});

      expect(results[0]!.publishedAt).toBeNull();
    });

    it('continues to next feed when one feed fails', async () => {
      mockParseURL
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ title: 'Feed B', items: [makeFeedItem()] });

      const provider = new RssProvider(
        { feedUrls: ['https://failing.com/feed', 'https://working.com/feed'] },
        logger,
      );

      const results = await provider.fetchOpportunities({});

      expect(results).toHaveLength(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it('populates metadata with feed context', async () => {
      mockParseURL.mockResolvedValue({
        title: 'Dev Blog Feed',
        items: [makeFeedItem()],
      });

      const feedUrl = 'https://devblog.example.com/feed';
      const provider = new RssProvider({ feedUrls: [feedUrl] }, logger);
      const results = await provider.fetchOpportunities({});

      expect(results[0]!.metadata['feedUrl']).toBe(feedUrl);
      expect(results[0]!.metadata['feedTitle']).toBe('Dev Blog Feed');
    });
  });
});
