import { createDomainEvent } from '../../../src/core/events/DomainEvent';
import {
  CAMPAIGN_EVENT_TYPES,
  type CampaignCreated,
  type CampaignApproved,
  type CampaignBudgetExceeded,
} from '../../../src/campaign/events/CampaignEvents';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';

describe('CampaignEvents', () => {
  describe('CAMPAIGN_EVENT_TYPES', () => {
    it('defines all required event type strings', () => {
      expect(CAMPAIGN_EVENT_TYPES.Created).toBe('campaign.created');
      expect(CAMPAIGN_EVENT_TYPES.Approved).toBe('campaign.approved');
      expect(CAMPAIGN_EVENT_TYPES.Started).toBe('campaign.started');
      expect(CAMPAIGN_EVENT_TYPES.Paused).toBe('campaign.paused');
      expect(CAMPAIGN_EVENT_TYPES.Completed).toBe('campaign.completed');
      expect(CAMPAIGN_EVENT_TYPES.Cancelled).toBe('campaign.cancelled');
      expect(CAMPAIGN_EVENT_TYPES.Archived).toBe('campaign.archived');
      expect(CAMPAIGN_EVENT_TYPES.BudgetExceeded).toBe('campaign.budget_exceeded');
    });
  });

  describe('CampaignCreated event shape', () => {
    it('creates a CampaignCreated event with correct payload', () => {
      const payload = { name: 'Test Campaign', ownerId: 'user-1', type: CampaignType.Marketing };
      const event = createDomainEvent(
        CAMPAIGN_EVENT_TYPES.Created,
        'campaign-1',
        payload,
      ) as CampaignCreated;

      expect(event.eventType).toBe('campaign.created');
      expect(event.aggregateId).toBe('campaign-1');
      expect(event.payload.name).toBe('Test Campaign');
      expect(event.payload.ownerId).toBe('user-1');
      expect(event.payload.type).toBe(CampaignType.Marketing);
      expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('CampaignApproved event shape', () => {
    it('creates a CampaignApproved event with approvedAt timestamp', () => {
      const approvedAt = new Date();
      const event = createDomainEvent(
        CAMPAIGN_EVENT_TYPES.Approved,
        'campaign-2',
        { approvedAt },
      ) as CampaignApproved;

      expect(event.eventType).toBe('campaign.approved');
      expect(event.payload.approvedAt).toEqual(approvedAt);
    });
  });

  describe('CampaignBudgetExceeded event shape', () => {
    it('creates a CampaignBudgetExceeded event with budget details', () => {
      const payload = { allocated: 10000, spent: 12000, currency: 'USD' };
      const event = createDomainEvent(
        CAMPAIGN_EVENT_TYPES.BudgetExceeded,
        'campaign-3',
        payload,
      ) as CampaignBudgetExceeded;

      expect(event.eventType).toBe('campaign.budget_exceeded');
      expect(event.payload.allocated).toBe(10000);
      expect(event.payload.spent).toBe(12000);
      expect(event.payload.currency).toBe('USD');
    });
  });

  it('each event has a unique eventId', () => {
    const e1 = createDomainEvent(CAMPAIGN_EVENT_TYPES.Created, 'c-1', {});
    const e2 = createDomainEvent(CAMPAIGN_EVENT_TYPES.Created, 'c-1', {});
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});
