import type { DecisionOutcome } from '../domain/models/InvestmentScore';

export interface StateVector {
  revenueScore: number;
  riskScore: number;
  competitionScore: number;
  productionCostScore: number;
  historicalROI: number;
}

export interface IReinforcementLearningAgent {
  getRecommendation(state: StateVector): Promise<DecisionOutcome>;
  updatePolicy(outcome: DecisionOutcome, reward: number): Promise<void>;
  isReady(): boolean;
}
