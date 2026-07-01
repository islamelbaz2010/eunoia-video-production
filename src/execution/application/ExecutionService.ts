import type { ProductionPlan } from '../../creative/domain/models/ProductionPlan';
import type { ILogger } from '../../shared/logger/ILogger';
import { NotFoundError } from '../../shared/errors/AppError';
import type { ExecutionPlan } from '../domain/models/ExecutionPlan';
import type { IExecutionRepository, ExecutionFilter } from '../domain/repositories/IExecutionRepository';
import { ExecutionPlanner } from '../planning/ExecutionPlanner';
import { ExecutionValidator } from '../validation/ExecutionValidator';
import { ExecutionEngine } from '../orchestration/ExecutionEngine';
import { AppError } from '../../shared/errors/AppError';

export interface ExecuteProductionPlanInput {
  productionPlan: ProductionPlan;
  campaignId: string | null;
  ownerId: string;
  productionPlanId: string | null;
}

export class ExecutionService {
  private readonly logger: ILogger;

  constructor(
    private readonly engine: ExecutionEngine,
    private readonly planner: ExecutionPlanner,
    private readonly validator: ExecutionValidator,
    private readonly repository: IExecutionRepository,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'ExecutionService' });
  }

  async execute(input: ExecuteProductionPlanInput): Promise<ExecutionPlan> {
    this.logger.info(
      { campaignId: input.campaignId, ownerId: input.ownerId },
      'Planning execution from ProductionPlan',
    );

    const { graph, context, estimatedDurationMs, estimatedCost } = this.planner.plan({
      productionPlan: input.productionPlan,
      campaignId: input.campaignId,
      ownerId: input.ownerId,
    });

    const validation = this.validator.validate(graph);
    if (!validation.valid) {
      const summary = validation.errors.map(e => e.message).join('; ');
      throw new AppError(`Execution graph validation failed: ${summary}`, 'VALIDATION_ERROR');
    }

    const { ExecutionPlan: ExecutionPlanClass } = await import('../domain/models/ExecutionPlan');
    const plan = ExecutionPlanClass.create({
      campaignId: input.campaignId,
      ownerId: input.ownerId,
      productionPlanId: input.productionPlanId,
      graph,
      context,
      estimatedDurationMs,
      estimatedCost,
    });

    const saved = await this.repository.savePlan(plan);

    this.logger.info(
      { planId: saved.id, nodeCount: saved.graph.nodes.length },
      'Executing plan',
    );

    return this.engine.execute(saved);
  }

  async cancel(planId: string, reason: string | null = null): Promise<ExecutionPlan> {
    this.logger.info({ planId, reason }, 'Cancelling execution plan');
    return this.engine.cancel(planId, reason);
  }

  async resume(planId: string): Promise<ExecutionPlan> {
    this.logger.info({ planId }, 'Resuming execution plan');
    return this.engine.resume(planId);
  }

  async getPlan(planId: string): Promise<ExecutionPlan> {
    const plan = await this.repository.findPlanById(planId);
    if (plan === null) throw new NotFoundError('ExecutionPlan', planId);
    return plan;
  }

  async listPlans(filter?: ExecutionFilter): Promise<ExecutionPlan[]> {
    return this.repository.findAllPlans(filter);
  }
}
