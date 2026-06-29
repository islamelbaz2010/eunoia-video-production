// Domain Models
export { RevenuePrediction } from './domain/models/RevenuePrediction';
export type { RevenuePredictionProps } from './domain/models/RevenuePrediction';
export { RevenueModel } from './domain/models/RevenueModel';
export type { RevenueModelProps } from './domain/models/RevenueModel';
export { CostModel, CostCategory } from './domain/models/CostModel';
export type { CostModelProps } from './domain/models/CostModel';
export { RiskAssessment, RiskLevel, RiskFactor } from './domain/models/RiskAssessment';
export type { RiskAssessmentProps } from './domain/models/RiskAssessment';
export { CompetitionAssessment, CompetitionLevel } from './domain/models/CompetitionAssessment';
export type { CompetitionAssessmentProps } from './domain/models/CompetitionAssessment';
export { InvestmentScore, DecisionOutcome, SCORE_WEIGHTS } from './domain/models/InvestmentScore';
export type { InvestmentScoreProps } from './domain/models/InvestmentScore';
export {
  InvestmentDecision,
  DecisionSubjectType,
} from './domain/models/InvestmentDecision';
export type {
  InvestmentDecisionProps,
  CreateInvestmentDecisionProps,
} from './domain/models/InvestmentDecision';

// Repository
export type { IRevenueRepository, RevenueFilter } from './domain/repositories/IRevenueRepository';

// Events
export { REVENUE_EVENT_TYPES } from './events/RevenueEvents';
export type {
  RevenueEventType,
  RevenuePredicted,
  InvestmentApproved,
  InvestmentRejected,
  InvestmentRequiresReview,
} from './events/RevenueEvents';

// Scoring
export { RiskEvaluator } from './scoring/RiskEvaluator';
export type { RiskEvaluationInput } from './scoring/RiskEvaluator';
export { CompetitionEvaluator } from './scoring/CompetitionEvaluator';
export type { CompetitionEvaluationInput } from './scoring/CompetitionEvaluator';
export { InvestmentScorer } from './scoring/InvestmentScorer';
export type { ScoreInputs } from './scoring/InvestmentScorer';

// Prediction
export { RevenuePredictionEngine } from './prediction/RevenuePredictionEngine';

// Application
export { RevenueIntelligenceService } from './application/RevenueIntelligenceService';
export type {
  EvaluateCampaignInput,
  EvaluateOpportunityInput,
} from './application/RevenueIntelligenceService';

// Infrastructure
export { SupabaseRevenueRepository } from './infrastructure/SupabaseRevenueRepository';

// Extension Points
export type { IMLPredictionModel, PredictionInputs, HistoricalMetrics } from './extensions/IMLPredictionModel';
export type { IHistoricalAnalyticsProvider } from './extensions/IHistoricalAnalyticsProvider';
export type { ILLMReasoningEngine, ReasoningContext } from './extensions/ILLMReasoningEngine';
export type { IABTestingService, ABTestVariant, ABTestResult } from './extensions/IABTestingService';
export type { IReinforcementLearningAgent, StateVector } from './extensions/IReinforcementLearningAgent';
