import { SupabaseRevenueRepository } from '../../../src/revenue/infrastructure/SupabaseRevenueRepository';
import { InvestmentDecision, DecisionSubjectType } from '../../../src/revenue/domain/models/InvestmentDecision';
import { InvestmentScore, DecisionOutcome } from '../../../src/revenue/domain/models/InvestmentScore';
import { RevenuePrediction } from '../../../src/revenue/domain/models/RevenuePrediction';
import { CostModel } from '../../../src/revenue/domain/models/CostModel';
import { RiskAssessment, RiskLevel } from '../../../src/revenue/domain/models/RiskAssessment';
import { CompetitionAssessment, CompetitionLevel } from '../../../src/revenue/domain/models/CompetitionAssessment';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { RepositoryError } from '../../../src/shared/errors/AppError';
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

  for (const method of [
    'select', 'upsert', 'update', 'delete',
    'eq', 'gte', 'lte', 'order', 'limit', 'range',
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
  return { from: jest.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
}

function getFirstCallArg(builder: Record<string, jest.Mock>, method: string): Record<string, unknown> {
  const mock = builder[method];
  if (mock === undefined) throw new Error(`mock '${method}' not found`);
  const call = mock.mock.calls[0] as unknown[] | undefined;
  if (call === undefined) throw new Error(`mock '${method}' was not called`);
  return call[0] as Record<string, unknown>;
}

function makeDecisionRow(overrides = {}): Record<string, unknown> {
  return {
    id: 'decision-1',
    subject_type: DecisionSubjectType.Campaign,
    subject_id: 'campaign-1',
    outcome: DecisionOutcome.GO,
    score: {
      revenuePotential: 80, riskScore: 70, competitionScore: 60,
      productionCostScore: 75, strategicValue: 65, goalAlignment: 70, total: 71, outcome: 'go',
    },
    prediction: {
      estimatedRevenue: 10000, estimatedProfit: 7000, estimatedROI: 233,
      estimatedCAC: 50, estimatedLTV: 200, breakEvenPoint: 30, paybackPeriodDays: 45, confidenceLevel: 80,
    },
    cost_model: {
      aiGenerationCost: 100, voiceGenerationCost: 50, imageGenerationCost: 30,
      videoGenerationCost: 200, editingCost: 80, publishingCost: 20,
      advertisingCost: 500, humanReviewCost: 60, infrastructureCost: 40, total: 1080,
    },
    risk_assessment: {
      riskLevel: RiskLevel.Low, factors: [], mitigations: [], overallScore: 10,
    },
    competition_assessment: {
      competitionLevel: CompetitionLevel.Low, competitorCount: 3,
      competitionScore: 20, marketSaturation: 0.2, differentiationScore: 80,
    },
    recommendation: 'Invest.',
    evaluated_at: new Date().toISOString(),
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeDecision(): InvestmentDecision {
  return InvestmentDecision.create({
    subjectType: DecisionSubjectType.Campaign,
    subjectId: 'campaign-1',
    outcome: DecisionOutcome.GO,
    score: InvestmentScore.create({ revenuePotential: 80, riskScore: 70, competitionScore: 60, productionCostScore: 75, strategicValue: 65, goalAlignment: 70 }),
    prediction: RevenuePrediction.create({ estimatedRevenue: 10000, estimatedProfit: 7000, estimatedROI: 233, estimatedCAC: 50, estimatedLTV: 200, breakEvenPoint: 30, paybackPeriodDays: 45, confidenceLevel: 80 }),
    costModel: CostModel.create({ aiGenerationCost: 100, voiceGenerationCost: 50, imageGenerationCost: 30, videoGenerationCost: 200, editingCost: 80, publishingCost: 20, advertisingCost: 500, humanReviewCost: 60, infrastructureCost: 40 }),
    riskAssessment: RiskAssessment.create({ riskLevel: RiskLevel.Low, factors: [], mitigations: [], overallScore: 10 }),
    competitionAssessment: CompetitionAssessment.create({ competitionLevel: CompetitionLevel.Low, competitorCount: 3, competitionScore: 20, marketSaturation: 0.2, differentiationScore: 80 }),
    recommendation: 'Invest.',
    metadata: {},
  });
}

describe('SupabaseRevenueRepository', () => {
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    logger = makeLogger();
  });

  describe('save()', () => {
    it('upserts and returns a domain decision', async () => {
      const row = makeDecisionRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.save(makeDecision());

      expect(builder['upsert']).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(InvestmentDecision);
      expect(result.subjectId).toBe('campaign-1');
    });

    it('throws RepositoryError on Supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'DB error' } });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await expect(repo.save(makeDecision())).rejects.toThrow(RepositoryError);
    });
  });

  describe('findById()', () => {
    it('returns a domain decision when found', async () => {
      const row = makeDecisionRow();
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.findById('decision-1');

      expect(result).toBeInstanceOf(InvestmentDecision);
    });

    it('returns null when not found', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.findById('unknown-id');

      expect(result).toBeNull();
    });

    it('throws RepositoryError on Supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'DB error' } });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await expect(repo.findById('id')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll()', () => {
    it('returns empty array when no rows', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('applies outcome filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ outcome: DecisionOutcome.GO });

      expect(builder['eq']).toHaveBeenCalledWith('outcome', DecisionOutcome.GO);
    });

    it('applies subjectType filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ subjectType: DecisionSubjectType.Campaign });

      expect(builder['eq']).toHaveBeenCalledWith('subject_type', DecisionSubjectType.Campaign);
    });

    it('applies subjectId filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ subjectId: 'campaign-1' });

      expect(builder['eq']).toHaveBeenCalledWith('subject_id', 'campaign-1');
    });

    it('applies since filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);
      const since = new Date('2026-01-01');

      await repo.findAll({ since });

      expect(builder['gte']).toHaveBeenCalledWith('evaluated_at', since.toISOString());
    });

    it('applies limit filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ limit: 10 });

      expect(builder['limit']).toHaveBeenCalledWith(10);
    });

    it('applies offset with range', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ offset: 20, limit: 10 });

      expect(builder['range']).toHaveBeenCalledWith(20, 29);
    });

    it('throws RepositoryError on Supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'error' } });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await expect(repo.findAll()).rejects.toThrow(RepositoryError);
    });
  });

  describe('findByCampaignId()', () => {
    it('filters by campaign subject', async () => {
      const builder = makeBuilder({ data: [makeDecisionRow()], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.findByCampaignId('campaign-1');

      expect(builder['eq']).toHaveBeenCalledWith('subject_type', DecisionSubjectType.Campaign);
      expect(builder['eq']).toHaveBeenCalledWith('subject_id', 'campaign-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByOpportunityId()', () => {
    it('filters by opportunity subject', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findByOpportunityId('opp-1');

      expect(builder['eq']).toHaveBeenCalledWith('subject_type', DecisionSubjectType.Opportunity);
      expect(builder['eq']).toHaveBeenCalledWith('subject_id', 'opp-1');
    });
  });

  describe('delete()', () => {
    it('deletes by id', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.delete('decision-1');

      expect(builder['delete']).toHaveBeenCalledTimes(1);
      expect(builder['eq']).toHaveBeenCalledWith('id', 'decision-1');
    });

    it('throws RepositoryError on Supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'error' } });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await expect(repo.delete('id')).rejects.toThrow(RepositoryError);
    });
  });

  describe('toDomain() null-fallbacks', () => {
    it('handles missing JSONB fields gracefully', async () => {
      const sparseRow = {
        ...makeDecisionRow(),
        score: {},
        prediction: {},
        cost_model: {},
        risk_assessment: {},
        competition_assessment: {},
      };
      const builder = makeBuilder({ data: sparseRow, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.findById('decision-1');

      expect(result).toBeInstanceOf(InvestmentDecision);
      expect(result?.score.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findAll() with offset only (no limit)', () => {
    it('uses default limit when offset is set but limit is not', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.findAll({ offset: 10 });

      expect(builder['range']).toHaveBeenCalledWith(10, 59);
    });
  });

  describe('count()', () => {
    it('returns count', async () => {
      const builder = makeBuilder({ count: 5, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.count();

      expect(result).toBe(5);
    });

    it('returns 0 when count is null', async () => {
      const builder = makeBuilder({ count: null, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      const result = await repo.count();

      expect(result).toBe(0);
    });

    it('applies outcome filter in count', async () => {
      const builder = makeBuilder({ count: 3, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.count({ outcome: DecisionOutcome.NO_GO });

      expect(builder['eq']).toHaveBeenCalledWith('outcome', DecisionOutcome.NO_GO);
    });

    it('applies subjectType filter in count', async () => {
      const builder = makeBuilder({ count: 3, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.count({ subjectType: DecisionSubjectType.Opportunity });

      expect(builder['eq']).toHaveBeenCalledWith('subject_type', DecisionSubjectType.Opportunity);
    });

    it('applies subjectId filter in count', async () => {
      const builder = makeBuilder({ count: 1, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await repo.count({ subjectId: 'campaign-1' });

      expect(builder['eq']).toHaveBeenCalledWith('subject_id', 'campaign-1');
    });

    it('applies since filter in count', async () => {
      const builder = makeBuilder({ count: 2, error: null });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);
      const since = new Date('2026-01-01');

      await repo.count({ since });

      expect(builder['gte']).toHaveBeenCalledWith('evaluated_at', since.toISOString());
    });

    it('throws RepositoryError on Supabase error', async () => {
      const builder = makeBuilder({ count: null, error: { message: 'error' } });
      const repo = new SupabaseRevenueRepository(makeClient(builder), logger);

      await expect(repo.count()).rejects.toThrow(RepositoryError);
    });
  });
});
