import { SupabaseCampaignRepository } from '../../../src/campaign/infrastructure/SupabaseCampaignRepository';
import {
  Campaign,
  CampaignStatus,
  CampaignType,
  CampaignPriority,
} from '../../../src/campaign/domain/models/Campaign';
import { CampaignBudget } from '../../../src/campaign/domain/models/CampaignBudget';
import { CampaignTarget } from '../../../src/campaign/domain/models/CampaignTarget';
import { CampaignGoal, CampaignGoalType } from '../../../src/campaign/domain/models/CampaignGoal';
import { CampaignAudience } from '../../../src/campaign/domain/models/CampaignAudience';
import { CampaignChannel } from '../../../src/campaign/domain/models/CampaignChannel';
import { CampaignMetrics } from '../../../src/campaign/domain/models/CampaignMetrics';
import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { RepositoryError, NotFoundError } from '../../../src/shared/errors/AppError';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

function makeBuilder(result: QueryResult = { data: null, error: null }) {
  const builder: Record<string, jest.Mock> = {};
  const chain = () => builder;

  for (const method of [
    'select',
    'upsert',
    'update',
    'delete',
    'eq',
    'neq',
    'gte',
    'lte',
    'or',
    'ilike',
    'order',
    'limit',
    'range',
  ]) {
    builder[method as string] = jest.fn().mockReturnValue(builder);
  }

  builder['single'] = jest.fn().mockResolvedValue(result);
  builder['maybeSingle'] = jest.fn().mockResolvedValue(result);
  builder['then'] = jest.fn().mockImplementation(
    (resolve: (v: QueryResult) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  );

  return builder;
}

function makeClient(builder: ReturnType<typeof makeBuilder>) {
  return {
    from: jest.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

function getFirstCallArg(builder: Record<string, jest.Mock>, method: string): Record<string, unknown> {
  const mock = builder[method];
  if (mock === undefined) throw new Error(`mock '${method}' not found`);
  const call = mock.mock.calls[0] as unknown[] | undefined;
  if (call === undefined) throw new Error(`mock '${method}' was not called`);
  return call[0] as Record<string, unknown>;
}

function makeCampaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    description: 'A test',
    type: 'marketing',
    status: 'draft',
    priority: 'normal',
    owner_id: 'owner-1',
    goal: {
      goal_type: 'revenue',
      description: 'Hit target',
      target_value: 50000,
      current_value: 0,
      achieved_at: null,
    },
    budget: { allocated: 5000, spent: 0, currency: 'USD' },
    target: {
      expected_revenue: 50000,
      expected_roi: 100,
      expected_views: 100000,
      expected_leads: 500,
      expected_subscribers: 2000,
      deadline: '2025-12-31T00:00:00.000Z',
    },
    metrics: {
      revenue: 0,
      cost: 0,
      views: 0,
      clicks: 0,
      conversion_rate: 0,
      subscribers: 0,
      leads: 0,
      ltv: 0,
    },
    audience: {
      segments: [],
      demographics: {},
      estimated_size: 0,
      target_age: null,
    },
    channels: [],
    lifecycle: {
      approved_at: null,
      started_at: null,
      paused_at: null,
      completed_at: null,
      cancelled_at: null,
      archived_at: null,
    },
    tags: [],
    metadata: {},
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCampaign(): Campaign {
  return Campaign.create({
    name: 'Test Campaign',
    description: 'A test',
    type: CampaignType.Marketing,
    priority: CampaignPriority.Normal,
    ownerId: 'owner-1',
    goal: CampaignGoal.create({
      goalType: CampaignGoalType.Revenue,
      description: 'Hit target',
      targetValue: 50000,
      currentValue: 0,
      achievedAt: null,
    }),
    budget: CampaignBudget.create({ allocated: 5000, spent: 0, currency: 'USD' }),
    target: CampaignTarget.create({
      expectedRevenue: 50000,
      expectedROI: 100,
      expectedViews: 100000,
      expectedLeads: 500,
      expectedSubscribers: 2000,
      deadline: new Date('2025-12-31T00:00:00Z'),
    }),
    audience: CampaignAudience.empty(),
    channels: [CampaignChannel.create({ name: 'YouTube', platform: 'youtube', enabled: true, config: {} })],
    tags: ['test'],
    metadata: { source: 'test' },
  });
}

describe('SupabaseCampaignRepository', () => {
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    logger = makeLogger();
  });

  describe('save', () => {
    it('upserts and returns the mapped domain entity', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      const campaign = makeCampaign();

      const result = await repo.save(campaign);

      expect(builder['upsert']).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Campaign);
      expect(result.name).toBe('Test Campaign');
    });

    it('throws RepositoryError when Supabase returns an error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'DB error' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.save(makeCampaign())).rejects.toThrow(RepositoryError);
    });
  });

  describe('findById', () => {
    it('returns mapped domain entity when found', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const result = await repo.findById('campaign-1');

      expect(result).toBeInstanceOf(Campaign);
      expect(result?.id).toBe('campaign-1');
    });

    it('returns null when not found', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const result = await repo.findById('unknown');
      expect(result).toBeNull();
    });

    it('throws RepositoryError on DB error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'conn error' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.findById('id')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll', () => {
    it('returns mapped domain entities', async () => {
      const rows = [makeCampaignRow(), makeCampaignRow({ id: 'campaign-2', name: 'Second' })];
      const builder = makeBuilder({ data: rows, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const results = await repo.findAll();
      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Campaign);
    });

    it('applies status filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.findAll({ status: CampaignStatus.Running });

      expect(builder['eq']).toHaveBeenCalledWith('status', CampaignStatus.Running);
    });

    it('applies type filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.findAll({ type: CampaignType.Marketing });

      expect(builder['eq']).toHaveBeenCalledWith('type', CampaignType.Marketing);
    });

    it('applies priority filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.findAll({ priority: CampaignPriority.High });

      expect(builder['eq']).toHaveBeenCalledWith('priority', CampaignPriority.High);
    });

    it('applies search filter via or()', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.findAll({ search: 'launch' });

      expect(builder['or']).toHaveBeenCalledWith(
        'name.ilike.%launch%,description.ilike.%launch%',
      );
    });

    it('throws RepositoryError on DB error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'error' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.findAll()).rejects.toThrow(RepositoryError);
    });
  });

  describe('update', () => {
    it('applies patch and returns updated campaign', async () => {
      const row = makeCampaignRow({ status: 'approved' });
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const result = await repo.update('campaign-1', { status: CampaignStatus.Approved });

      expect(result).toBeInstanceOf(Campaign);
      expect(builder['update']).toHaveBeenCalled();
    });

    it('throws RepositoryError on DB error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'fail' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.update('id', { status: CampaignStatus.Approved })).rejects.toThrow(
        RepositoryError,
      );
    });

    it('throws NotFoundError when data is null', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.update('missing', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('calls delete without error', async () => {
      const builder = makeBuilder({ error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.delete('campaign-1')).resolves.toBeUndefined();
      expect(builder['delete']).toHaveBeenCalled();
    });

    it('throws RepositoryError on DB error', async () => {
      const builder = makeBuilder({ error: { message: 'delete failed' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.delete('id')).rejects.toThrow(RepositoryError);
    });
  });

  describe('count', () => {
    it('returns count from Supabase', async () => {
      const builder = makeBuilder({ count: 42, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const count = await repo.count();
      expect(count).toBe(42);
    });

    it('returns 0 when count is null', async () => {
      const builder = makeBuilder({ count: null, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const count = await repo.count();
      expect(count).toBe(0);
    });

    it('throws RepositoryError on DB error', async () => {
      const builder = makeBuilder({ count: 0, error: { message: 'count error' } });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await expect(repo.count()).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll — additional filter branches', () => {
    it('applies ownerId filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.findAll({ ownerId: 'owner-42' });
      expect(builder['eq']).toHaveBeenCalledWith('owner_id', 'owner-42');
    });

    it('applies limit filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.findAll({ limit: 10 });
      expect(builder['limit']).toHaveBeenCalledWith(10);
    });

    it('applies offset+limit as range', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.findAll({ limit: 10, offset: 20 });
      expect(builder['range']).toHaveBeenCalledWith(20, 29);
    });
  });

  describe('update — patch field branches', () => {
    it('applies name and description patch', async () => {
      const row = makeCampaignRow({ name: 'New Name' });
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const result = await repo.update('campaign-1', {
        name: 'New Name',
        description: 'New description',
      });

      expect(result.name).toBe('New Name');
    });

    it('applies budget patch', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      const budget = CampaignBudget.create({ allocated: 9000, spent: 1000, currency: 'EUR' });

      await repo.update('campaign-1', { budget });

      const updateArg = getFirstCallArg(builder, 'update');
      expect(updateArg?.['budget']).toEqual({ allocated: 9000, spent: 1000, currency: 'EUR' });
    });

    it('applies metrics patch', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      const metrics = CampaignMetrics.create({
        revenue: 5000, cost: 1000, views: 10000, clicks: 500,
        conversionRate: 2, subscribers: 100, leads: 50, ltv: 200,
      });

      await repo.update('campaign-1', { metrics });

      const updateArg = getFirstCallArg(builder, 'update');
      const metricsRow = updateArg?.['metrics'] as Record<string, unknown>;
      expect(metricsRow?.['revenue']).toBe(5000);
      expect(metricsRow?.['conversion_rate']).toBe(2);
    });

    it('applies lifecycle patch with timestamps', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      const lifecycle = CampaignLifecycle.empty().withApprovedAt(new Date('2025-03-01T00:00:00Z'));

      await repo.update('campaign-1', { lifecycle });

      const updateArg = getFirstCallArg(builder, 'update');
      const lcRow = updateArg?.['lifecycle'] as Record<string, unknown>;
      expect(lcRow?.['approved_at']).toBe('2025-03-01T00:00:00.000Z');
      expect(lcRow?.['started_at']).toBeNull();
    });

    it('applies tags and metadata patch', async () => {
      const row = makeCampaignRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.update('campaign-1', {
        tags: ['new-tag'],
        metadata: { updated: true },
      });

      const updateArg = getFirstCallArg(builder, 'update');
      expect(updateArg?.['tags']).toEqual(['new-tag']);
      expect(updateArg?.['metadata']).toEqual({ updated: true });
    });
  });

  describe('count — filter branches', () => {
    it('applies status filter to count', async () => {
      const builder = makeBuilder({ count: 5, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.count({ status: CampaignStatus.Running });
      expect(builder['eq']).toHaveBeenCalledWith('status', CampaignStatus.Running);
    });

    it('applies type filter to count', async () => {
      const builder = makeBuilder({ count: 3, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.count({ type: CampaignType.Marketing });
      expect(builder['eq']).toHaveBeenCalledWith('type', CampaignType.Marketing);
    });

    it('applies priority filter to count', async () => {
      const builder = makeBuilder({ count: 2, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.count({ priority: CampaignPriority.Critical });
      expect(builder['eq']).toHaveBeenCalledWith('priority', CampaignPriority.Critical);
    });

    it('applies ownerId filter to count', async () => {
      const builder = makeBuilder({ count: 7, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.count({ ownerId: 'owner-99' });
      expect(builder['eq']).toHaveBeenCalledWith('owner_id', 'owner-99');
    });

    it('applies search filter to count', async () => {
      const builder = makeBuilder({ count: 1, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);
      await repo.count({ search: 'launch' });
      expect(builder['or']).toHaveBeenCalledWith(
        'name.ilike.%launch%,description.ilike.%launch%',
      );
    });
  });

  describe('search', () => {
    it('delegates to findAll with search in filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      await repo.search('youtube campaign', { status: CampaignStatus.Running });

      expect(builder['or']).toHaveBeenCalledWith(
        'name.ilike.%youtube campaign%,description.ilike.%youtube campaign%',
      );
    });
  });

  describe('round-trip mapping', () => {
    it('toDomain correctly maps all fields from a row', async () => {
      const row = makeCampaignRow({
        status: 'approved',
        priority: 'high',
        tags: ['launch', 'q4'],
        metadata: { source: 'internal' },
        lifecycle: {
          approved_at: '2025-01-10T00:00:00.000Z',
          started_at: null,
          paused_at: null,
          completed_at: null,
          cancelled_at: null,
          archived_at: null,
        },
        channels: [
          { name: 'YouTube', platform: 'youtube', enabled: true, config: { quality: 'hd' } },
        ],
      });

      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseCampaignRepository(makeClient(builder), logger);

      const result = await repo.findById('campaign-1');

      expect(result?.status).toBe(CampaignStatus.Approved);
      expect(result?.priority).toBe(CampaignPriority.High);
      expect(result?.tags).toEqual(['launch', 'q4']);
      expect(result?.lifecycle.approvedAt).toEqual(new Date('2025-01-10T00:00:00.000Z'));
      expect(result?.channels).toHaveLength(1);
      expect(result?.channels[0]?.name).toBe('YouTube');
      expect(result?.channels[0]?.config).toEqual({ quality: 'hd' });
    });
  });
});
