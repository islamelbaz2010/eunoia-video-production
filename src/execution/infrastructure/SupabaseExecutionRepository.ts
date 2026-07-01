import type { SupabaseClient } from '@supabase/supabase-js';
import { ExecutionPlan } from '../domain/models/ExecutionPlan';
import { ExecutionGraph } from '../domain/models/ExecutionGraph';
import { ExecutionNode } from '../domain/models/ExecutionNode';
import { ExecutionEdge } from '../domain/models/ExecutionEdge';
import { ExecutionContext } from '../domain/models/ExecutionContext';
import { ExecutionCheckpoint } from '../domain/models/ExecutionCheckpoint';
import { ExecutionResult } from '../domain/models/ExecutionResult';
import { ExecutionArtifact } from '../domain/models/ExecutionArtifact';
import { ExecutionStatus } from '../domain/models/ExecutionStatus';
import { NodeType } from '../domain/models/NodeType';
import type { EdgeCondition } from '../domain/models/ExecutionEdge';
import type {
  IExecutionRepository,
  ExecutionFilter,
} from '../domain/repositories/IExecutionRepository';
import type { ILogger } from '../../shared/logger/ILogger';
import { NotFoundError, RepositoryError } from '../../shared/errors/AppError';

interface NodeResultRow {
  nodeId: string;
  status: string;
  output: Record<string, unknown>;
  durationMs: number;
  error: string | null;
  completedAt: string;
}

interface NodeRow {
  id: string;
  planId: string;
  type: string;
  status: string;
  priority: number;
  config: Record<string, unknown>;
  result: NodeResultRow | null;
  retryCount: number;
  maxRetries: number;
  estimatedDurationMs: number;
  estimatedCost: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface EdgeRow {
  fromNodeId: string;
  toNodeId: string;
  condition: string;
}

interface GraphRow {
  id: string;
  planId: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
  createdAt: string;
}

interface ContextRow {
  planId: string;
  campaignId: string | null;
  ownerId: string;
  variables: Record<string, unknown>;
  artifacts: ArtifactRow[];
}

interface ArtifactRow {
  id: string;
  nodeId: string;
  type: string;
  url: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

interface ExecutionPlanRow {
  id: string;
  campaign_id: string | null;
  owner_id: string;
  production_plan_id: string | null;
  graph: GraphRow;
  context: ContextRow;
  status: string;
  estimated_duration_ms: number;
  estimated_cost: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CheckpointRow {
  id: string;
  plan_id: string;
  node_statuses: Record<string, string>;
  artifacts: ArtifactRow[];
  created_at: string;
}

export class SupabaseExecutionRepository implements IExecutionRepository {
  private static readonly PLANS_TABLE = 'execution_plans';
  private static readonly CHECKPOINTS_TABLE = 'execution_checkpoints';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: ILogger,
  ) {}

  async savePlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
    const row = this.planToRow(plan);

    const { data, error } = await this.client
      .from(SupabaseExecutionRepository.PLANS_TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, planId: plan.id }, 'Failed to save execution plan');
      throw new RepositoryError(`Failed to save execution plan: ${error.message}`);
    }

    return this.planToDomain(data as ExecutionPlanRow);
  }

  async findPlanById(id: string): Promise<ExecutionPlan | null> {
    const { data, error } = await this.client
      .from(SupabaseExecutionRepository.PLANS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to find execution plan');
      throw new RepositoryError(`Failed to find execution plan: ${error.message}`);
    }

    return data !== null ? this.planToDomain(data as ExecutionPlanRow) : null;
  }

  async findAllPlans(filter?: ExecutionFilter): Promise<ExecutionPlan[]> {
    let query = this.client
      .from(SupabaseExecutionRepository.PLANS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.status !== undefined) {
      query = query.eq('status', filter.status);
    }
    if (filter?.campaignId !== undefined) {
      query = query.eq('campaign_id', filter.campaignId);
    }
    if (filter?.ownerId !== undefined) {
      query = query.eq('owner_id', filter.ownerId);
    }
    if (filter?.limit !== undefined) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset !== undefined && filter.limit !== undefined) {
      query = query.range(filter.offset, filter.offset + filter.limit - 1);
    }

    const { data, error } = await query;

    if (error !== null) {
      this.logger.error({ error }, 'Failed to fetch execution plans');
      throw new RepositoryError(`Failed to fetch execution plans: ${error.message}`);
    }

    return ((data as ExecutionPlanRow[]) ?? []).map(row => this.planToDomain(row));
  }

  async deletePlan(id: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseExecutionRepository.PLANS_TABLE)
      .delete()
      .eq('id', id);

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to delete execution plan');
      throw new RepositoryError(`Failed to delete execution plan: ${error.message}`);
    }
  }

  async saveCheckpoint(checkpoint: ExecutionCheckpoint): Promise<ExecutionCheckpoint> {
    const row = this.checkpointToRow(checkpoint);

    const { data, error } = await this.client
      .from(SupabaseExecutionRepository.CHECKPOINTS_TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, checkpointId: checkpoint.id }, 'Failed to save checkpoint');
      throw new RepositoryError(`Failed to save checkpoint: ${error.message}`);
    }

    return this.checkpointToDomain(data as CheckpointRow);
  }

  async findCheckpointsByPlanId(planId: string): Promise<ExecutionCheckpoint[]> {
    const { data, error } = await this.client
      .from(SupabaseExecutionRepository.CHECKPOINTS_TABLE)
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });

    if (error !== null) {
      this.logger.error({ error, planId }, 'Failed to fetch checkpoints');
      throw new RepositoryError(`Failed to fetch checkpoints: ${error.message}`);
    }

    return ((data as CheckpointRow[]) ?? []).map(row => this.checkpointToDomain(row));
  }

  async findLatestCheckpoint(planId: string): Promise<ExecutionCheckpoint | null> {
    const { data, error } = await this.client
      .from(SupabaseExecutionRepository.CHECKPOINTS_TABLE)
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, planId }, 'Failed to fetch latest checkpoint');
      throw new RepositoryError(`Failed to fetch latest checkpoint: ${error.message}`);
    }

    return data !== null ? this.checkpointToDomain(data as CheckpointRow) : null;
  }

  private planToRow(plan: ExecutionPlan): ExecutionPlanRow {
    return {
      id: plan.id,
      campaign_id: plan.campaignId,
      owner_id: plan.ownerId,
      production_plan_id: plan.productionPlanId,
      graph: this.graphToRow(plan.graph),
      context: this.contextToRow(plan.context),
      status: plan.status,
      estimated_duration_ms: plan.estimatedDurationMs,
      estimated_cost: plan.estimatedCost,
      started_at: plan.startedAt?.toISOString() ?? null,
      completed_at: plan.completedAt?.toISOString() ?? null,
      created_at: plan.createdAt.toISOString(),
      updated_at: plan.updatedAt.toISOString(),
    };
  }

  private planToDomain(row: ExecutionPlanRow): ExecutionPlan {
    const graph = this.graphToDomain(row.graph);
    const context = this.contextToDomain(row.context);

    return ExecutionPlan.reconstitute({
      id: row.id,
      campaignId: row.campaign_id,
      ownerId: row.owner_id,
      productionPlanId: row.production_plan_id,
      graph,
      context,
      status: row.status as ExecutionStatus,
      estimatedDurationMs: row.estimated_duration_ms,
      estimatedCost: row.estimated_cost,
      startedAt: row.started_at !== null ? new Date(row.started_at) : null,
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : null,
      checkpoints: [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private graphToRow(graph: ExecutionGraph): GraphRow {
    return {
      id: graph.id,
      planId: graph.planId,
      nodes: graph.nodes.map(n => this.nodeToRow(n)),
      edges: graph.edges.map(e => ({
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        condition: e.condition,
      })),
      createdAt: graph.createdAt.toISOString(),
    };
  }

  private graphToDomain(row: GraphRow): ExecutionGraph {
    const nodes = row.nodes.map(n => this.nodeToDomain(n));
    const edges = row.edges.map(e =>
      ExecutionEdge.reconstitute({
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        condition: e.condition as EdgeCondition,
      }),
    );

    return ExecutionGraph.reconstitute({
      id: row.id,
      planId: row.planId,
      nodes,
      edges,
      createdAt: new Date(row.createdAt),
    });
  }

  private nodeToRow(node: ExecutionNode): NodeRow {
    return {
      id: node.id,
      planId: node.planId,
      type: node.type,
      status: node.status,
      priority: node.priority,
      config: { ...node.config },
      result:
        node.result !== null
          ? {
              nodeId: node.result.nodeId,
              status: node.result.status,
              output: { ...node.result.output },
              durationMs: node.result.durationMs,
              error: node.result.error,
              completedAt: node.result.completedAt.toISOString(),
            }
          : null,
      retryCount: node.retryCount,
      maxRetries: node.maxRetries,
      estimatedDurationMs: node.estimatedDurationMs,
      estimatedCost: node.estimatedCost,
      startedAt: node.startedAt?.toISOString() ?? null,
      completedAt: node.completedAt?.toISOString() ?? null,
      error: node.error,
      metadata: { ...node.metadata },
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };
  }

  private nodeToDomain(row: NodeRow): ExecutionNode {
    const result =
      row.result !== null
        ? ExecutionResult.create({
            nodeId: row.result.nodeId,
            status: row.result.status as ExecutionStatus,
            output: row.result.output,
            durationMs: row.result.durationMs,
            error: row.result.error,
            completedAt: new Date(row.result.completedAt),
          })
        : null;

    return ExecutionNode.reconstitute({
      id: row.id,
      planId: row.planId,
      type: row.type as NodeType,
      status: row.status as ExecutionStatus,
      priority: row.priority,
      config: row.config,
      result,
      retryCount: row.retryCount,
      maxRetries: row.maxRetries,
      estimatedDurationMs: row.estimatedDurationMs,
      estimatedCost: row.estimatedCost,
      startedAt: row.startedAt !== null ? new Date(row.startedAt) : null,
      completedAt: row.completedAt !== null ? new Date(row.completedAt) : null,
      error: row.error,
      metadata: row.metadata,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private contextToRow(ctx: ExecutionContext): ContextRow {
    return {
      planId: ctx.planId,
      campaignId: ctx.campaignId,
      ownerId: ctx.ownerId,
      variables: { ...ctx.variables },
      artifacts: ctx.artifacts.map(a => this.artifactToRow(a)),
    };
  }

  private contextToDomain(row: ContextRow): ExecutionContext {
    return ExecutionContext.create({
      planId: row.planId,
      campaignId: row.campaignId,
      ownerId: row.ownerId,
      variables: row.variables,
      artifacts: row.artifacts.map(a => this.artifactToDomain(a)),
    });
  }

  private artifactToRow(artifact: ExecutionArtifact): ArtifactRow {
    return {
      id: artifact.id,
      nodeId: artifact.nodeId,
      type: artifact.type,
      url: artifact.url,
      data: { ...artifact.data },
      createdAt: artifact.createdAt.toISOString(),
    };
  }

  private artifactToDomain(row: ArtifactRow): ExecutionArtifact {
    return ExecutionArtifact.reconstitute({
      id: row.id,
      nodeId: row.nodeId,
      type: row.type,
      url: row.url,
      data: row.data,
      createdAt: new Date(row.createdAt),
    });
  }

  private checkpointToRow(checkpoint: ExecutionCheckpoint): CheckpointRow {
    const nodeStatuses: Record<string, string> = {};
    for (const [id, status] of Object.entries(checkpoint.nodeStatuses)) {
      nodeStatuses[id] = status;
    }

    return {
      id: checkpoint.id,
      plan_id: checkpoint.planId,
      node_statuses: nodeStatuses,
      artifacts: checkpoint.artifacts.map(a => this.artifactToRow(a)),
      created_at: checkpoint.createdAt.toISOString(),
    };
  }

  private checkpointToDomain(row: CheckpointRow): ExecutionCheckpoint {
    const nodeStatuses: Record<string, ExecutionStatus> = {};
    for (const [id, status] of Object.entries(row.node_statuses)) {
      nodeStatuses[id] = status as ExecutionStatus;
    }

    return ExecutionCheckpoint.reconstitute({
      id: row.id,
      planId: row.plan_id,
      nodeStatuses,
      artifacts: row.artifacts.map(a => this.artifactToDomain(a)),
      createdAt: new Date(row.created_at),
    });
  }
}

export { NotFoundError };
