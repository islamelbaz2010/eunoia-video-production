import { CREATIVE_EVENT_TYPES } from '../../../src/creative/events/CreativeEvents';
import { createDomainEvent } from '../../../src/core/events/DomainEvent';
import { CreativeStrategyType } from '../../../src/creative/domain/types';

describe('CreativeEvents', () => {
  it('has 5 distinct event type strings', () => {
    const types = Object.values(CREATIVE_EVENT_TYPES);
    expect(types).toHaveLength(5);
    expect(new Set(types).size).toBe(5);
  });

  it('PlanGenerated event is creatable', () => {
    const event = createDomainEvent(CREATIVE_EVENT_TYPES.PlanGenerated, 'plan-1', {
      campaignId: 'campaign-1',
      strategyType: CreativeStrategyType.Tutorial,
      promptCount: 10,
      platformCount: 2,
    });
    expect(event.eventType).toBe('creative.plan_generated');
    expect(event.aggregateId).toBe('plan-1');
  });

  it('PromptPackageCreated event is creatable', () => {
    const event = createDomainEvent(CREATIVE_EVENT_TYPES.PromptPackageCreated, 'plan-2', {
      planId: 'plan-2',
      llmPromptCount: 5,
      imagePromptCount: 1,
      videoPromptCount: 3,
      voicePromptCount: 3,
      musicPromptCount: 1,
    });
    expect(event.eventType).toBe('creative.prompt_package_created');
  });

  it('ProductionPlanCreated event is creatable', () => {
    const event = createDomainEvent(CREATIVE_EVENT_TYPES.ProductionPlanCreated, 'plan-3', {
      planId: 'plan-3',
      sceneCount: 8,
      estimatedProductionDays: 4,
      platformCount: 2,
    });
    expect(event.eventType).toBe('creative.production_plan_created');
  });

  it('PlanApproved event is creatable', () => {
    const event = createDomainEvent(CREATIVE_EVENT_TYPES.PlanApproved, 'plan-4', {
      planId: 'plan-4',
      campaignId: 'campaign-1',
    });
    expect(event.eventType).toBe('creative.plan_approved');
  });

  it('PlanRejected event is creatable', () => {
    const event = createDomainEvent(CREATIVE_EVENT_TYPES.PlanRejected, 'plan-5', {
      planId: 'plan-5',
      campaignId: 'campaign-1',
      reason: 'Low quality',
    });
    expect(event.eventType).toBe('creative.plan_rejected');
  });
});
