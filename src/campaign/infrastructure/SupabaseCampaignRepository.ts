import type { SupabaseClient } from '@supabase/supabase-js';
import { Campaign, CampaignStatus, CampaignType, CampaignPriority } from '../domain/models/Campaign';
import { CampaignBudget } from '../domain/models/CampaignBudget';
import { CampaignTarget } from '../domain/models/CampaignTarget';
import { CampaignMetrics } from '../domain/models/CampaignMetrics';
import { CampaignGoal, CampaignGoalType } from '../domain/models/CampaignGoal';
import { CampaignAudience } from '../domain/models/CampaignAudience';
import { CampaignChannel } from '../domain/models/CampaignChannel';
import { CampaignLifecycle } from '../domain/models/CampaignLifecycle';
import type {
  ICampaignRepository,
  CampaignFilter,
  CampaignPatch,
} from '../domain/repositories/ICampaignRepository';
import type { ILogger } from '../../shared/logger/ILogger';
import { NotFoundError, RepositoryError } from '../../shared/errors/AppError';

interface GoalRow {
  goal_type: string;
  description: string;
  target_value: number;
  current_value: number;
  achieved_at: string | null;
}

interface BudgetRow {
  allocated: number;
  spent: number;
  currency: string;
}

interface TargetRow {
  expected_revenue: number;
  expected_roi: number;
  expected_views: number;
  expected_leads: number;
  expected_subscribers: number;
  deadline: string;
}

interface MetricsRow {
  revenue: number;
  cost: number;
  views: number;
  clicks: number;
  conversion_rate: number;
  subscribers: number;
  leads: number;
  ltv: number;
}

interface AudienceRow {
  segments: string[];
  demographics: Record<string, unknown>;
  estimated_size: number;
  target_age: { min: number; max: number } | null;
}

interface ChannelRow {
  name: string;
  platform: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface LifecycleRow {
  approved_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
}

interface CampaignRow {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  owner_id: string;
  goal: GoalRow;
  budget: BudgetRow;
  target: TargetRow;
  metrics: MetricsRow;
  audience: AudienceRow;
  channels: ChannelRow[];
  lifecycle: LifecycleRow;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class SupabaseCampaignRepository implements ICampaignRepository {
  private static readonly TABLE = 'campaigns';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: ILogger,
  ) {}

  async save(campaign: Campaign): Promise<Campaign> {
    const row = this.toRow(campaign);

    const { data, error } = await this.client
      .from(SupabaseCampaignRepository.TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, id: campaign.id }, 'Failed to save campaign');
      throw new RepositoryError(`Failed to save campaign: ${error.message}`);
    }

    return this.toDomain(data as CampaignRow);
  }

  async findById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.client
      .from(SupabaseCampaignRepository.TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to find campaign by id');
      throw new RepositoryError(`Failed to find campaign: ${error.message}`);
    }

    return data !== null ? this.toDomain(data as CampaignRow) : null;
  }

  async findAll(filter?: CampaignFilter): Promise<Campaign[]> {
    let query = this.client
      .from(SupabaseCampaignRepository.TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.status !== undefined) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type !== undefined) {
      query = query.eq('type', filter.type);
    }
    if (filter?.priority !== undefined) {
      query = query.eq('priority', filter.priority);
    }
    if (filter?.ownerId !== undefined) {
      query = query.eq('owner_id', filter.ownerId);
    }
    if (filter?.search !== undefined) {
      query = query.or(
        `name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`,
      );
    }
    if (filter?.limit !== undefined) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset !== undefined && filter.limit !== undefined) {
      query = query.range(filter.offset, filter.offset + filter.limit - 1);
    }

    const { data, error } = await query;

    if (error !== null) {
      this.logger.error({ error }, 'Failed to fetch campaigns');
      throw new RepositoryError(`Failed to fetch campaigns: ${error.message}`);
    }

    return ((data as CampaignRow[]) ?? []).map(row => this.toDomain(row));
  }

  async update(id: string, patch: CampaignPatch): Promise<Campaign> {
    const updateData: Partial<CampaignRow> = {};

    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.priority !== undefined) updateData.priority = patch.priority;
    if (patch.tags !== undefined) updateData.tags = patch.tags;
    if (patch.metadata !== undefined) updateData.metadata = patch.metadata;
    if (patch.budget !== undefined) {
      updateData.budget = {
        allocated: patch.budget.allocated,
        spent: patch.budget.spent,
        currency: patch.budget.currency,
      };
    }
    if (patch.metrics !== undefined) {
      updateData.metrics = {
        revenue: patch.metrics.revenue,
        cost: patch.metrics.cost,
        views: patch.metrics.views,
        clicks: patch.metrics.clicks,
        conversion_rate: patch.metrics.conversionRate,
        subscribers: patch.metrics.subscribers,
        leads: patch.metrics.leads,
        ltv: patch.metrics.ltv,
      };
    }
    if (patch.lifecycle !== undefined) {
      updateData.lifecycle = {
        approved_at: patch.lifecycle.approvedAt?.toISOString() ?? null,
        started_at: patch.lifecycle.startedAt?.toISOString() ?? null,
        paused_at: patch.lifecycle.pausedAt?.toISOString() ?? null,
        completed_at: patch.lifecycle.completedAt?.toISOString() ?? null,
        cancelled_at: patch.lifecycle.cancelledAt?.toISOString() ?? null,
        archived_at: patch.lifecycle.archivedAt?.toISOString() ?? null,
      };
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.client
      .from(SupabaseCampaignRepository.TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to update campaign');
      throw new RepositoryError(`Failed to update campaign ${id}: ${error.message}`);
    }

    if (data === null) {
      throw new NotFoundError('Campaign', id);
    }

    return this.toDomain(data as CampaignRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseCampaignRepository.TABLE)
      .delete()
      .eq('id', id);

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to delete campaign');
      throw new RepositoryError(`Failed to delete campaign ${id}: ${error.message}`);
    }
  }

  async count(filter?: CampaignFilter): Promise<number> {
    let query = this.client
      .from(SupabaseCampaignRepository.TABLE)
      .select('id', { count: 'exact', head: true });

    if (filter?.status !== undefined) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type !== undefined) {
      query = query.eq('type', filter.type);
    }
    if (filter?.priority !== undefined) {
      query = query.eq('priority', filter.priority);
    }
    if (filter?.ownerId !== undefined) {
      query = query.eq('owner_id', filter.ownerId);
    }
    if (filter?.search !== undefined) {
      query = query.or(
        `name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`,
      );
    }

    const { count, error } = await query;

    if (error !== null) {
      this.logger.error({ error }, 'Failed to count campaigns');
      throw new RepositoryError(`Failed to count campaigns: ${error.message}`);
    }

    return count ?? 0;
  }

  async search(query: string, filter?: Omit<CampaignFilter, 'search'>): Promise<Campaign[]> {
    return this.findAll({ ...filter, search: query });
  }

  private toRow(campaign: Campaign): CampaignRow {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      status: campaign.status,
      priority: campaign.priority,
      owner_id: campaign.ownerId,
      goal: {
        goal_type: campaign.goal.goalType,
        description: campaign.goal.description,
        target_value: campaign.goal.targetValue,
        current_value: campaign.goal.currentValue,
        achieved_at: campaign.goal.achievedAt?.toISOString() ?? null,
      },
      budget: {
        allocated: campaign.budget.allocated,
        spent: campaign.budget.spent,
        currency: campaign.budget.currency,
      },
      target: {
        expected_revenue: campaign.target.expectedRevenue,
        expected_roi: campaign.target.expectedROI,
        expected_views: campaign.target.expectedViews,
        expected_leads: campaign.target.expectedLeads,
        expected_subscribers: campaign.target.expectedSubscribers,
        deadline: campaign.target.deadline.toISOString(),
      },
      metrics: {
        revenue: campaign.metrics.revenue,
        cost: campaign.metrics.cost,
        views: campaign.metrics.views,
        clicks: campaign.metrics.clicks,
        conversion_rate: campaign.metrics.conversionRate,
        subscribers: campaign.metrics.subscribers,
        leads: campaign.metrics.leads,
        ltv: campaign.metrics.ltv,
      },
      audience: {
        segments: [...campaign.audience.segments],
        demographics: { ...campaign.audience.demographics },
        estimated_size: campaign.audience.estimatedSize,
        target_age: campaign.audience.targetAge
          ? { min: campaign.audience.targetAge.min, max: campaign.audience.targetAge.max }
          : null,
      },
      channels: campaign.channels.map(ch => ({
        name: ch.name,
        platform: ch.platform,
        enabled: ch.enabled,
        config: { ...ch.config },
      })),
      lifecycle: {
        approved_at: campaign.lifecycle.approvedAt?.toISOString() ?? null,
        started_at: campaign.lifecycle.startedAt?.toISOString() ?? null,
        paused_at: campaign.lifecycle.pausedAt?.toISOString() ?? null,
        completed_at: campaign.lifecycle.completedAt?.toISOString() ?? null,
        cancelled_at: campaign.lifecycle.cancelledAt?.toISOString() ?? null,
        archived_at: campaign.lifecycle.archivedAt?.toISOString() ?? null,
      },
      tags: [...campaign.tags],
      metadata: { ...campaign.metadata },
      created_at: campaign.createdAt.toISOString(),
      updated_at: campaign.updatedAt.toISOString(),
    };
  }

  private toDomain(row: CampaignRow): Campaign {
    return Campaign.reconstitute({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as CampaignType,
      status: row.status as CampaignStatus,
      priority: row.priority as CampaignPriority,
      ownerId: row.owner_id,
      goal: CampaignGoal.create({
        goalType: row.goal.goal_type as CampaignGoalType,
        description: row.goal.description,
        targetValue: row.goal.target_value,
        currentValue: row.goal.current_value,
        achievedAt: row.goal.achieved_at !== null ? new Date(row.goal.achieved_at) : null,
      }),
      budget: CampaignBudget.create({
        allocated: row.budget.allocated,
        spent: row.budget.spent,
        currency: row.budget.currency,
      }),
      target: CampaignTarget.create({
        expectedRevenue: row.target.expected_revenue,
        expectedROI: row.target.expected_roi,
        expectedViews: row.target.expected_views,
        expectedLeads: row.target.expected_leads,
        expectedSubscribers: row.target.expected_subscribers,
        deadline: new Date(row.target.deadline),
      }),
      metrics: CampaignMetrics.create({
        revenue: row.metrics.revenue,
        cost: row.metrics.cost,
        views: row.metrics.views,
        clicks: row.metrics.clicks,
        conversionRate: row.metrics.conversion_rate,
        subscribers: row.metrics.subscribers,
        leads: row.metrics.leads,
        ltv: row.metrics.ltv,
      }),
      audience: CampaignAudience.create({
        segments: row.audience.segments,
        demographics: row.audience.demographics,
        estimatedSize: row.audience.estimated_size,
        targetAge: row.audience.target_age,
      }),
      channels: row.channels.map(ch =>
        CampaignChannel.create({
          name: ch.name,
          platform: ch.platform,
          enabled: ch.enabled,
          config: ch.config,
        }),
      ),
      lifecycle: CampaignLifecycle.create({
        approvedAt: row.lifecycle.approved_at !== null ? new Date(row.lifecycle.approved_at) : null,
        startedAt: row.lifecycle.started_at !== null ? new Date(row.lifecycle.started_at) : null,
        pausedAt: row.lifecycle.paused_at !== null ? new Date(row.lifecycle.paused_at) : null,
        completedAt:
          row.lifecycle.completed_at !== null ? new Date(row.lifecycle.completed_at) : null,
        cancelledAt:
          row.lifecycle.cancelled_at !== null ? new Date(row.lifecycle.cancelled_at) : null,
        archivedAt:
          row.lifecycle.archived_at !== null ? new Date(row.lifecycle.archived_at) : null,
      }),
      tags: row.tags,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
