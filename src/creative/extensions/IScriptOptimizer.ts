import type { ScriptPlan } from '../domain/models/ScriptPlan';
import type { ContentBrief } from '../domain/models/ContentBrief';

export interface IScriptOptimizer {
  optimize(plan: ScriptPlan, brief: ContentBrief): Promise<ScriptPlan>;
  isAvailable(): boolean;
}
