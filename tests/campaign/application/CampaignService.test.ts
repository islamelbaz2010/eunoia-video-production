import { CampaignService } from '../../../src/campaign/application/CampaignService';
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
import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';
import type { ICampaignRepository } from '../../../src/campaign/domain/repositories/ICampaignRepository';
import type { IEventBus } from '../../../src/core/events/IEventBus';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { CAMPAIGN_EVENT_TYPES } from '../../../src/campaign/events/CampaignEvents';
import { AppError, NotFoundError } from '../../../src/shared/errors/AppError';
import type { CreateCampaignInput } from '../../../src/campaign/application/CampaignService';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeEventBus(): jest.Mocked<IEventBus> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };
}

function makeRepository(): jest.Mocked<ICampaignRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    search: jest.fn(),
  };
}

function makeInput(overrides: Partial<CreateCampaignInput> = {}): CreateCampaignInput {
  return {
    name: 'Test Campaign',
    description: 'A test campaign',
    type: CampaignType.Marketing,
    priority: CampaignPriority.Normal,
    ownerId: 'owner-1',
    goal: CampaignGoal.create({
      goalType: CampaignGoalType.Revenue,
      description: 'Hit revenue',
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
    channels: [],
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function makeCampaign(status = CampaignStatus.Draft, lifecycle = CampaignLifecycle.empty()): Campaign {
  const base = Campaign.create(makeInput());
  let c = status !== CampaignStatus.Draft ? base.withStatus(status) : base;
  if (lifecycle !== CampaignLifecycle.empty()) {
    c = c.withLifecycle(lifecycle);
  }
  return c;
}

describe('CampaignService', () => {
  let service: CampaignService;
  let repository: jest.Mocked<ICampaignRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    repository = makeRepository();
    eventBus = makeEventBus();
    logger = makeLogger();
    service = new CampaignService(repository, eventBus, logger);
  });

  describe('createCampaign', () => {
    it('saves the campaign and returns it', async () => {
      const saved = makeCampaign();
      repository.save.mockResolvedValue(saved);

      const result = await service.createCampaign(makeInput());

      expect(repository.save).toHaveBeenCalledTimes(1);
      const passedCampaign = repository.save.mock.calls[0]?.[0];
      expect(passedCampaign?.status).toBe(CampaignStatus.Draft);
      expect(result).toBe(saved);
    });

    it('publishes CampaignCreated event', async () => {
      const saved = makeCampaign();
      repository.save.mockResolvedValue(saved);

      await service.createCampaign(makeInput());

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Created }),
      );
    });
  });

  describe('approveCampaign', () => {
    it('transitions Researching -> Approved and publishes event', async () => {
      const campaign = makeCampaign(CampaignStatus.Researching);
      repository.findById.mockResolvedValue(campaign);
      const saved = campaign.withStatus(CampaignStatus.Approved);
      repository.save.mockResolvedValue(saved);

      const result = await service.approveCampaign(campaign.id);

      expect(result.status).toBe(CampaignStatus.Approved);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Approved }),
      );
    });

    it('sets lifecycle.approvedAt when approving', async () => {
      const campaign = makeCampaign(CampaignStatus.Researching);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.approveCampaign(campaign.id);

      expect(result.lifecycle.approvedAt).not.toBeNull();
    });

    it('throws on invalid transition (Draft -> Approved)', async () => {
      const campaign = makeCampaign(CampaignStatus.Draft);
      repository.findById.mockResolvedValue(campaign);

      await expect(service.approveCampaign(campaign.id)).rejects.toThrow(AppError);
    });

    it('throws NotFoundError when campaign does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.approveCampaign('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('throws when campaign is archived', async () => {
      const campaign = makeCampaign(CampaignStatus.Archived);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.approveCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('startCampaign', () => {
    it('transitions Approved -> Running and publishes event', async () => {
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date());
      const campaign = makeCampaign(CampaignStatus.Approved, lc);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.startCampaign(campaign.id);

      expect(result.status).toBe(CampaignStatus.Running);
      expect(result.lifecycle.startedAt).not.toBeNull();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Started }),
      );
    });

    it('throws when campaign is in Draft status', async () => {
      const campaign = makeCampaign(CampaignStatus.Draft);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.startCampaign(campaign.id)).rejects.toThrow(AppError);
    });

    it('throws on invalid transition (Completed -> Running)', async () => {
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date());
      const campaign = makeCampaign(CampaignStatus.Completed, lc);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.startCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('pauseCampaign', () => {
    it('transitions Running -> Paused and publishes event', async () => {
      const campaign = makeCampaign(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.pauseCampaign(campaign.id);

      expect(result.status).toBe(CampaignStatus.Paused);
      expect(result.lifecycle.pausedAt).not.toBeNull();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Paused }),
      );
    });

    it('throws on invalid transition (Draft -> Paused)', async () => {
      const campaign = makeCampaign(CampaignStatus.Draft);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.pauseCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('completeCampaign', () => {
    it('transitions Running -> Completed when approved', async () => {
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date());
      const campaign = makeCampaign(CampaignStatus.Running, lc);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.completeCampaign(campaign.id);

      expect(result.status).toBe(CampaignStatus.Completed);
      expect(result.lifecycle.completedAt).not.toBeNull();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Completed }),
      );
    });

    it('throws when campaign has not been approved', async () => {
      const campaign = makeCampaign(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);

      await expect(service.completeCampaign(campaign.id)).rejects.toMatchObject({
        code: 'CAMPAIGN_NOT_APPROVED',
      });
    });

    it('throws on invalid transition (Draft -> Completed)', async () => {
      const campaign = makeCampaign(CampaignStatus.Draft);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.completeCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('archiveCampaign', () => {
    it('transitions Completed -> Archived and publishes event', async () => {
      const campaign = makeCampaign(CampaignStatus.Completed);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.archiveCampaign(campaign.id);

      expect(result.status).toBe(CampaignStatus.Archived);
      expect(result.lifecycle.archivedAt).not.toBeNull();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Archived }),
      );
    });

    it('throws on invalid transition (Running -> Archived)', async () => {
      const campaign = makeCampaign(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.archiveCampaign(campaign.id)).rejects.toThrow(AppError);
    });

    it('throws when already archived', async () => {
      const campaign = makeCampaign(CampaignStatus.Archived);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.archiveCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('cancelCampaign', () => {
    it('transitions any active status -> Cancelled and publishes event', async () => {
      for (const status of [
        CampaignStatus.Draft,
        CampaignStatus.Planning,
        CampaignStatus.Running,
        CampaignStatus.Paused,
      ]) {
        const campaign = makeCampaign(status);
        repository.findById.mockResolvedValue(campaign);
        repository.save.mockImplementation(async c => c);

        const result = await service.cancelCampaign(campaign.id);

        expect(result.status).toBe(CampaignStatus.Cancelled);
        expect(result.lifecycle.cancelledAt).not.toBeNull();
        expect(eventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.Cancelled }),
        );

        jest.clearAllMocks();
        repository.save.mockResolvedValue.bind(repository.save);
        eventBus.publish.mockResolvedValue(undefined);
        repository.save.mockImplementation(async c => c);
      }
    });

    it('throws when campaign is already archived', async () => {
      const campaign = makeCampaign(CampaignStatus.Archived);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.cancelCampaign(campaign.id)).rejects.toThrow(AppError);
    });

    it('throws when campaign is already cancelled', async () => {
      const campaign = makeCampaign(CampaignStatus.Cancelled);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.cancelCampaign(campaign.id)).rejects.toThrow(AppError);
    });
  });

  describe('recordBudgetSpend', () => {
    it('updates budget spend and returns updated campaign', async () => {
      const campaign = makeCampaign(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      const result = await service.recordBudgetSpend(campaign.id, 2000);

      expect(result.budget.spent).toBe(2000);
    });

    it('publishes CampaignBudgetExceeded event when spend crosses allocation', async () => {
      const campaign = makeCampaign(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      await service.recordBudgetSpend(campaign.id, 6000);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.BudgetExceeded }),
      );
    });

    it('does not publish BudgetExceeded if already exceeded before update', async () => {
      const budget = CampaignBudget.create({ allocated: 5000, spent: 6000, currency: 'USD' });
      const campaign = Campaign.create(makeInput({ budget })).withStatus(CampaignStatus.Running);
      repository.findById.mockResolvedValue(campaign);
      repository.save.mockImplementation(async c => c);

      await service.recordBudgetSpend(campaign.id, 7000);

      expect(eventBus.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: CAMPAIGN_EVENT_TYPES.BudgetExceeded }),
      );
    });

    it('throws for archived campaign', async () => {
      const campaign = makeCampaign(CampaignStatus.Archived);
      repository.findById.mockResolvedValue(campaign);
      await expect(service.recordBudgetSpend(campaign.id, 1000)).rejects.toThrow(AppError);
    });
  });

  describe('getCampaign', () => {
    it('returns campaign by id', async () => {
      const campaign = makeCampaign();
      repository.findById.mockResolvedValue(campaign);
      const result = await service.getCampaign(campaign.id);
      expect(result).toBe(campaign);
    });

    it('throws NotFoundError when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getCampaign('unknown')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listCampaigns', () => {
    it('delegates to repository.findAll with filter', async () => {
      const campaigns = [makeCampaign()];
      repository.findAll.mockResolvedValue(campaigns);
      const result = await service.listCampaigns({ status: CampaignStatus.Draft });
      expect(repository.findAll).toHaveBeenCalledWith({ status: CampaignStatus.Draft });
      expect(result).toBe(campaigns);
    });
  });

  describe('searchCampaigns', () => {
    it('delegates to repository.search with query and filter', async () => {
      const campaigns = [makeCampaign()];
      repository.search.mockResolvedValue(campaigns);
      const result = await service.searchCampaigns('product launch', { priority: CampaignPriority.High });
      expect(repository.search).toHaveBeenCalledWith('product launch', { priority: CampaignPriority.High });
      expect(result).toBe(campaigns);
    });
  });
});
