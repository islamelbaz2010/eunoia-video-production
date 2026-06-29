import { DiscoveryService } from '../../../../src/discovery/application/services/DiscoveryService';
import { Opportunity, OpportunityStatus } from '../../../../src/discovery/domain/models/Opportunity';
import { OpportunityScore } from '../../../../src/discovery/domain/models/OpportunityScore';
import { DiscoverySource, type IDiscoveryProvider, type RawOpportunity } from '../../../../src/discovery/domain/providers/IDiscoveryProvider';
import type { IProviderRegistry } from '../../../../src/discovery/domain/registry/IProviderRegistry';
import type { IOpportunityRepository } from '../../../../src/discovery/domain/repositories/IOpportunityRepository';
import type { IOpportunityScoringService } from '../../../../src/discovery/application/scoring/IOpportunityScoringService';
import type { ILogger } from '../../../../src/shared/logger/ILogger';

function makeScore(): OpportunityScore {
  return OpportunityScore.create({ relevance: 70, engagement: 50, timeliness: 80, competition: 20 });
}

function makeRaw(overrides: Partial<RawOpportunity> = {}): RawOpportunity {
  return {
    title: 'Sample Article',
    summary: 'Sample summary',
    url: 'https://example.com/article',
    publishedAt: new Date(),
    metadata: {},
    ...overrides,
  };
}

function makeProvider(name: string, configured = true, rawItems: RawOpportunity[] = []): jest.Mocked<IDiscoveryProvider> {
  return {
    name,
    source: DiscoverySource.RSS,
    isConfigured: jest.fn().mockReturnValue(configured),
    fetchOpportunities: jest.fn().mockResolvedValue(rawItems),
  };
}

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeSavedOpportunity(raw: RawOpportunity, score: OpportunityScore): Opportunity {
  return Opportunity.create({
    title: raw.title,
    summary: raw.summary,
    source: DiscoverySource.RSS,
    sourceUrl: raw.url,
    score,
    keywords: [],
    metadata: raw.metadata,
    publishedAt: raw.publishedAt,
  });
}

describe('DiscoveryService', () => {
  let registry: jest.Mocked<IProviderRegistry>;
  let repository: jest.Mocked<IOpportunityRepository>;
  let scoringService: jest.Mocked<IOpportunityScoringService>;
  let logger: jest.Mocked<ILogger>;
  let service: DiscoveryService;

  beforeEach(() => {
    registry = {
      register: jest.fn(),
      unregister: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
      getConfigured: jest.fn().mockReturnValue([]),
    };

    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    scoringService = {
      score: jest.fn().mockReturnValue(makeScore()),
    };

    logger = makeLogger();

    service = new DiscoveryService(registry, repository, scoringService, logger);
  });

  describe('discover', () => {
    it('returns an empty array when no providers are configured', async () => {
      registry.getConfigured.mockReturnValue([]);
      const result = await service.discover({});
      expect(result).toEqual([]);
    });

    it('fetches from all configured providers', async () => {
      const rawA = makeRaw({ title: 'Article A' });
      const rawB = makeRaw({ title: 'Article B' });
      const providerA = makeProvider('rss', true, [rawA]);
      const providerB = makeProvider('reddit', true, [rawB]);

      registry.getConfigured.mockReturnValue([providerA, providerB]);
      repository.save.mockImplementation(opp => Promise.resolve(opp));

      const result = await service.discover({});

      expect(providerA.fetchOpportunities).toHaveBeenCalledTimes(1);
      expect(providerB.fetchOpportunities).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('uses specific providers when providerNames is supplied', async () => {
      const rssProvider = makeProvider('rss', true, [makeRaw()]);
      const ytProvider = makeProvider('youtube', true, [makeRaw()]);

      registry.get.mockImplementation(name => (name === 'rss' ? rssProvider : undefined));
      repository.save.mockImplementation(opp => Promise.resolve(opp));

      const result = await service.discover({ providerNames: ['rss'] });

      expect(rssProvider.fetchOpportunities).toHaveBeenCalledTimes(1);
      expect(ytProvider.fetchOpportunities).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('skips unconfigured providers in providerNames', async () => {
      const unconfigured = makeProvider('youtube', false, [makeRaw()]);
      registry.get.mockImplementation(name => (name === 'youtube' ? unconfigured : undefined));

      const result = await service.discover({ providerNames: ['youtube'] });

      expect(unconfigured.fetchOpportunities).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('continues when a provider throws an error', async () => {
      const failingProvider = makeProvider('rss', true);
      (failingProvider.fetchOpportunities as jest.Mock).mockRejectedValue(new Error('Network error'));

      const workingProvider = makeProvider('reddit', true, [makeRaw()]);
      repository.save.mockImplementation(opp => Promise.resolve(opp));

      registry.getConfigured.mockReturnValue([failingProvider, workingProvider]);

      const result = await service.discover({});

      expect(logger.error).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('calls scoringService for each raw item', async () => {
      const items = [makeRaw({ title: 'A' }), makeRaw({ title: 'B' })];
      const provider = makeProvider('rss', true, items);

      registry.getConfigured.mockReturnValue([provider]);
      repository.save.mockImplementation(opp => Promise.resolve(opp));

      await service.discover({ keywords: ['test'] });

      expect(scoringService.score).toHaveBeenCalledTimes(2);
    });

    it('passes keywords from params to saved opportunities', async () => {
      const raw = makeRaw();
      const provider = makeProvider('rss', true, [raw]);
      registry.getConfigured.mockReturnValue([provider]);

      let capturedOpportunity: Opportunity | undefined;
      repository.save.mockImplementation(opp => {
        capturedOpportunity = opp;
        return Promise.resolve(opp);
      });

      await service.discover({ keywords: ['typescript', 'node'] });

      expect(capturedOpportunity?.keywords).toEqual(['typescript', 'node']);
    });

    it('returns the saved opportunities from the repository', async () => {
      const raw = makeRaw();
      const score = makeScore();
      const provider = makeProvider('rss', true, [raw]);
      registry.getConfigured.mockReturnValue([provider]);

      const savedOpp = makeSavedOpportunity(raw, score);
      repository.save.mockResolvedValue(savedOpp);

      const result = await service.discover({});

      expect(result[0]).toBe(savedOpp);
    });
  });

  describe('getOpportunities', () => {
    it('delegates to repository.findAll without filter', async () => {
      await service.getOpportunities();
      expect(repository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('delegates to repository.findAll with filter', async () => {
      const filter = { status: OpportunityStatus.NEW, minScore: 70 };
      await service.getOpportunities(filter);
      expect(repository.findAll).toHaveBeenCalledWith(filter);
    });
  });

  describe('reviewOpportunity', () => {
    it('calls repository.update with ACCEPTED status', async () => {
      const opp = makeSavedOpportunity(makeRaw(), makeScore());
      repository.update.mockResolvedValue(opp.withStatus(OpportunityStatus.ACCEPTED));

      await service.reviewOpportunity(opp.id, true);

      expect(repository.update).toHaveBeenCalledWith(opp.id, {
        status: OpportunityStatus.ACCEPTED,
      });
    });

    it('calls repository.update with REJECTED status', async () => {
      const opp = makeSavedOpportunity(makeRaw(), makeScore());
      repository.update.mockResolvedValue(opp.withStatus(OpportunityStatus.REJECTED));

      await service.reviewOpportunity(opp.id, false);

      expect(repository.update).toHaveBeenCalledWith(opp.id, {
        status: OpportunityStatus.REJECTED,
      });
    });
  });
});
