import { REVENUE_EVENT_TYPES } from '../../../src/revenue/events/RevenueEvents';
import { createDomainEvent } from '../../../src/core/events/DomainEvent';
import { DecisionOutcome } from '../../../src/revenue/domain/models/InvestmentScore';

describe('RevenueEvents', () => {
  it('REVENUE_EVENT_TYPES has 4 distinct event type strings', () => {
    const types = Object.values(REVENUE_EVENT_TYPES);
    expect(types).toHaveLength(4);
    expect(new Set(types).size).toBe(4);
  });

  it('RevenuePredicted event is creatable', () => {
    const event = createDomainEvent(REVENUE_EVENT_TYPES.RevenuePredicted, 'decision-1', {
      subjectId: 'campaign-1',
      estimatedRevenue: 5000,
      estimatedROI: 150,
      confidenceLevel: 70,
    });
    expect(event.eventType).toBe('revenue.predicted');
    expect(event.aggregateId).toBe('decision-1');
    expect((event.payload as { subjectId: string }).subjectId).toBe('campaign-1');
  });

  it('InvestmentApproved event is creatable', () => {
    const event = createDomainEvent(REVENUE_EVENT_TYPES.InvestmentApproved, 'decision-2', {
      subjectId: 'campaign-2',
      score: 85,
      outcome: DecisionOutcome.GO,
      estimatedRevenue: 10000,
    });
    expect(event.eventType).toBe('revenue.investment_approved');
  });

  it('InvestmentRejected event is creatable', () => {
    const event = createDomainEvent(REVENUE_EVENT_TYPES.InvestmentRejected, 'decision-3', {
      subjectId: 'campaign-3',
      score: 20,
      outcome: DecisionOutcome.NO_GO,
      reason: 'Too risky',
    });
    expect(event.eventType).toBe('revenue.investment_rejected');
  });

  it('InvestmentRequiresReview event is creatable', () => {
    const event = createDomainEvent(REVENUE_EVENT_TYPES.InvestmentRequiresReview, 'decision-4', {
      subjectId: 'campaign-4',
      score: 55,
      outcome: DecisionOutcome.REVIEW,
      riskFactors: ['high_competition'],
    });
    expect(event.eventType).toBe('revenue.investment_requires_review');
  });
});
