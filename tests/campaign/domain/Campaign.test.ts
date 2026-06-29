import {
  Campaign,
  CampaignType,
  CampaignStatus,
  CampaignPriority,
  type CreateCampaignProps,
} from '../../../src/campaign/domain/models/Campaign';
import { CampaignBudget } from '../../../src/campaign/domain/models/CampaignBudget';
import { CampaignTarget } from '../../../src/campaign/domain/models/CampaignTarget';
import { CampaignMetrics } from '../../../src/campaign/domain/models/CampaignMetrics';
import { CampaignGoal, CampaignGoalType } from '../../../src/campaign/domain/models/CampaignGoal';
import { CampaignAudience } from '../../../src/campaign/domain/models/CampaignAudience';
import { CampaignChannel } from '../../../src/campaign/domain/models/CampaignChannel';
import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';

function makeCreateProps(
  overrides: Partial<CreateCampaignProps> = {},
): CreateCampaignProps {
  return {
    name: 'Q4 Product Launch',
    description: 'Full funnel product launch campaign',
    type: CampaignType.Marketing,
    priority: CampaignPriority.High,
    ownerId: 'user-1',
    goal: CampaignGoal.create({
      goalType: CampaignGoalType.Revenue,
      description: 'Hit $100k',
      targetValue: 100000,
      currentValue: 0,
      achievedAt: null,
    }),
    budget: CampaignBudget.create({ allocated: 10000, spent: 0, currency: 'USD' }),
    target: CampaignTarget.create({
      expectedRevenue: 100000,
      expectedROI: 200,
      expectedViews: 500000,
      expectedLeads: 1000,
      expectedSubscribers: 5000,
      deadline: new Date('2025-12-31T00:00:00Z'),
    }),
    audience: CampaignAudience.empty(),
    channels: [CampaignChannel.create({ name: 'YouTube', platform: 'youtube', enabled: true, config: {} })],
    tags: ['launch', 'q4'],
    metadata: { source: 'internal' },
    ...overrides,
  };
}

describe('Campaign', () => {
  describe('create', () => {
    it('generates a unique UUID id', () => {
      const a = Campaign.create(makeCreateProps());
      const b = Campaign.create(makeCreateProps());
      expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(a.id).not.toBe(b.id);
    });

    it('sets initial status to Draft', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.status).toBe(CampaignStatus.Draft);
    });

    it('initialises with empty metrics', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.metrics.revenue).toBe(0);
      expect(campaign.metrics.cost).toBe(0);
    });

    it('initialises with empty lifecycle', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.lifecycle.approvedAt).toBeNull();
      expect(campaign.lifecycle.startedAt).toBeNull();
    });

    it('sets createdAt and updatedAt to approximately now', () => {
      const before = new Date();
      const campaign = Campaign.create(makeCreateProps());
      const after = new Date();
      expect(campaign.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(campaign.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(campaign.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('stores provided fields', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.name).toBe('Q4 Product Launch');
      expect(campaign.type).toBe(CampaignType.Marketing);
      expect(campaign.priority).toBe(CampaignPriority.High);
      expect(campaign.ownerId).toBe('user-1');
      expect(campaign.tags).toEqual(['launch', 'q4']);
    });

    it('freezes channels', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(() => {
        (campaign.channels as CampaignChannel[]).push(
          CampaignChannel.create({ name: 'x', platform: 'x', enabled: true, config: {} }),
        );
      }).toThrow();
    });

    it('freezes tags', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(() => {
        (campaign.tags as string[]).push('extra');
      }).toThrow();
    });
  });

  describe('reconstitute', () => {
    it('restores a campaign with exact props', () => {
      const original = Campaign.create(makeCreateProps());
      const restored = Campaign.reconstitute({
        id: original.id,
        name: original.name,
        description: original.description,
        type: original.type,
        status: original.status,
        priority: original.priority,
        ownerId: original.ownerId,
        goal: original.goal,
        budget: original.budget,
        target: original.target,
        metrics: original.metrics,
        audience: original.audience,
        channels: [...original.channels],
        lifecycle: original.lifecycle,
        tags: [...original.tags],
        metadata: { ...original.metadata },
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
      });

      expect(restored.id).toBe(original.id);
      expect(restored.status).toBe(original.status);
      expect(restored.createdAt).toEqual(original.createdAt);
    });
  });

  describe('withStatus', () => {
    it('returns a new campaign with updated status', () => {
      const original = Campaign.create(makeCreateProps());
      const updated = original.withStatus(CampaignStatus.Planning);
      expect(updated.status).toBe(CampaignStatus.Planning);
      expect(original.status).toBe(CampaignStatus.Draft);
    });

    it('returns a different object reference', () => {
      const original = Campaign.create(makeCreateProps());
      const updated = original.withStatus(CampaignStatus.Planning);
      expect(updated).not.toBe(original);
    });

    it('updates updatedAt', () => {
      const before = new Date();
      const original = Campaign.create(makeCreateProps());
      const updated = original.withStatus(CampaignStatus.Planning);
      const after = new Date();
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('withBudget', () => {
    it('returns a new campaign with updated budget', () => {
      const campaign = Campaign.create(makeCreateProps());
      const newBudget = CampaignBudget.create({ allocated: 20000, spent: 500, currency: 'USD' });
      const updated = campaign.withBudget(newBudget);
      expect(updated.budget.allocated).toBe(20000);
      expect(campaign.budget.allocated).toBe(10000);
    });
  });

  describe('withMetrics', () => {
    it('returns a new campaign with updated metrics', () => {
      const campaign = Campaign.create(makeCreateProps());
      const newMetrics = CampaignMetrics.create({
        revenue: 5000,
        cost: 1000,
        views: 10000,
        clicks: 500,
        conversionRate: 2,
        subscribers: 100,
        leads: 50,
        ltv: 200,
      });
      const updated = campaign.withMetrics(newMetrics);
      expect(updated.metrics.revenue).toBe(5000);
    });
  });

  describe('withLifecycle', () => {
    it('returns a new campaign with updated lifecycle', () => {
      const campaign = Campaign.create(makeCreateProps());
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date());
      const updated = campaign.withLifecycle(lc);
      expect(updated.lifecycle.approvedAt).not.toBeNull();
      expect(campaign.lifecycle.approvedAt).toBeNull();
    });
  });

  describe('isReadOnly', () => {
    it('returns false for non-archived campaigns', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.isReadOnly()).toBe(false);
    });

    it('returns true for archived campaigns', () => {
      const campaign = Campaign.create(makeCreateProps()).withStatus(CampaignStatus.Archived);
      expect(campaign.isReadOnly()).toBe(true);
    });
  });

  describe('isActive', () => {
    it('returns true for Running status', () => {
      const campaign = Campaign.create(makeCreateProps()).withStatus(CampaignStatus.Running);
      expect(campaign.isActive()).toBe(true);
    });

    it('returns true for Publishing status', () => {
      const campaign = Campaign.create(makeCreateProps()).withStatus(CampaignStatus.Publishing);
      expect(campaign.isActive()).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(Campaign.create(makeCreateProps()).isActive()).toBe(false);
      expect(Campaign.create(makeCreateProps()).withStatus(CampaignStatus.Paused).isActive()).toBe(false);
    });
  });

  describe('isBudgetExceeded', () => {
    it('returns false when within budget', () => {
      const campaign = Campaign.create(makeCreateProps());
      expect(campaign.isBudgetExceeded()).toBe(false);
    });

    it('returns true when spent exceeds allocated', () => {
      const budget = CampaignBudget.create({ allocated: 1000, spent: 1500, currency: 'USD' });
      const campaign = Campaign.create(makeCreateProps({ budget }));
      expect(campaign.isBudgetExceeded()).toBe(true);
    });
  });
});
