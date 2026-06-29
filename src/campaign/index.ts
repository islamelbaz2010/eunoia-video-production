// Domain — enumerations & entity
export {
  Campaign,
  CampaignType,
  CampaignStatus,
  CampaignPriority,
} from './domain/models/Campaign';
export type { CampaignProps, CreateCampaignProps } from './domain/models/Campaign';

// Domain — value objects
export { CampaignBudget } from './domain/models/CampaignBudget';
export type { CampaignBudgetProps } from './domain/models/CampaignBudget';

export { CampaignTarget } from './domain/models/CampaignTarget';
export type { CampaignTargetProps } from './domain/models/CampaignTarget';

export { CampaignMetrics } from './domain/models/CampaignMetrics';
export type { CampaignMetricsProps } from './domain/models/CampaignMetrics';

export { CampaignGoal, CampaignGoalType } from './domain/models/CampaignGoal';
export type { CampaignGoalProps } from './domain/models/CampaignGoal';

export { CampaignAudience } from './domain/models/CampaignAudience';
export type { CampaignAudienceProps, AgeRange } from './domain/models/CampaignAudience';

export { CampaignChannel } from './domain/models/CampaignChannel';
export type { CampaignChannelProps } from './domain/models/CampaignChannel';

export { CampaignLifecycle } from './domain/models/CampaignLifecycle';
export type { CampaignLifecycleProps } from './domain/models/CampaignLifecycle';

// Domain — repository contract
export type {
  ICampaignRepository,
  CampaignFilter,
  CampaignPatch,
} from './domain/repositories/ICampaignRepository';

// Domain events
export { CAMPAIGN_EVENT_TYPES } from './events/CampaignEvents';
export type {
  CampaignEventType,
  CampaignCreated,
  CampaignApproved,
  CampaignStarted,
  CampaignPaused,
  CampaignCompleted,
  CampaignCancelled,
  CampaignArchived,
  CampaignBudgetExceeded,
} from './events/CampaignEvents';

// Application — service
export { CampaignService } from './application/CampaignService';
export type { CreateCampaignInput } from './application/CampaignService';

// Infrastructure — repository
export { SupabaseCampaignRepository } from './infrastructure/SupabaseCampaignRepository';
