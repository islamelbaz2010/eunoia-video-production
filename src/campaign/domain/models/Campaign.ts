import { randomUUID } from 'crypto';
import type { CampaignBudget } from './CampaignBudget';
import type { CampaignTarget } from './CampaignTarget';
import type { CampaignMetrics } from './CampaignMetrics';
import type { CampaignGoal } from './CampaignGoal';
import type { CampaignAudience } from './CampaignAudience';
import type { CampaignChannel } from './CampaignChannel';
import type { CampaignLifecycle } from './CampaignLifecycle';
import { CampaignMetrics as CampaignMetricsClass } from './CampaignMetrics';
import { CampaignLifecycle as CampaignLifecycleClass } from './CampaignLifecycle';

export enum CampaignType {
  Marketing = 'marketing',
  Content = 'content',
  LeadGeneration = 'lead_generation',
  Affiliate = 'affiliate',
  Whop = 'whop',
  BrandAwareness = 'brand_awareness',
  AgencyClient = 'agency_client',
  Internal = 'internal',
  Seasonal = 'seasonal',
  Evergreen = 'evergreen',
}

export enum CampaignStatus {
  Draft = 'draft',
  Planning = 'planning',
  Researching = 'researching',
  Approved = 'approved',
  Producing = 'producing',
  Publishing = 'publishing',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Archived = 'archived',
  Cancelled = 'cancelled',
}

export enum CampaignPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

export interface CampaignProps {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  priority: CampaignPriority;
  ownerId: string;
  goal: CampaignGoal;
  budget: CampaignBudget;
  target: CampaignTarget;
  metrics: CampaignMetrics;
  audience: CampaignAudience;
  channels: CampaignChannel[];
  lifecycle: CampaignLifecycle;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCampaignProps = Omit<
  CampaignProps,
  'id' | 'status' | 'metrics' | 'lifecycle' | 'createdAt' | 'updatedAt'
>;

export class Campaign {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: CampaignType;
  readonly status: CampaignStatus;
  readonly priority: CampaignPriority;
  readonly ownerId: string;
  readonly goal: CampaignGoal;
  readonly budget: CampaignBudget;
  readonly target: CampaignTarget;
  readonly metrics: CampaignMetrics;
  readonly audience: CampaignAudience;
  readonly channels: ReadonlyArray<CampaignChannel>;
  readonly lifecycle: CampaignLifecycle;
  readonly tags: ReadonlyArray<string>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CampaignProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.type = props.type;
    this.status = props.status;
    this.priority = props.priority;
    this.ownerId = props.ownerId;
    this.goal = props.goal;
    this.budget = props.budget;
    this.target = props.target;
    this.metrics = props.metrics;
    this.audience = props.audience;
    this.channels = Object.freeze([...props.channels]);
    this.lifecycle = props.lifecycle;
    this.tags = Object.freeze([...props.tags]);
    this.metadata = Object.freeze({ ...props.metadata });
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  static create(props: CreateCampaignProps): Campaign {
    const now = new Date();
    return new Campaign({
      ...props,
      id: randomUUID(),
      status: CampaignStatus.Draft,
      metrics: CampaignMetricsClass.empty(),
      lifecycle: CampaignLifecycleClass.empty(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CampaignProps): Campaign {
    return new Campaign(props);
  }

  withStatus(status: CampaignStatus): Campaign {
    return Campaign.reconstitute({ ...this.toProps(), status, updatedAt: new Date() });
  }

  withBudget(budget: CampaignBudget): Campaign {
    return Campaign.reconstitute({ ...this.toProps(), budget, updatedAt: new Date() });
  }

  withMetrics(metrics: CampaignMetrics): Campaign {
    return Campaign.reconstitute({ ...this.toProps(), metrics, updatedAt: new Date() });
  }

  withLifecycle(lifecycle: CampaignLifecycle): Campaign {
    return Campaign.reconstitute({ ...this.toProps(), lifecycle, updatedAt: new Date() });
  }

  isReadOnly(): boolean {
    return this.status === CampaignStatus.Archived;
  }

  isActive(): boolean {
    return (
      this.status === CampaignStatus.Running || this.status === CampaignStatus.Publishing
    );
  }

  isBudgetExceeded(): boolean {
    return this.budget.isExceeded();
  }

  private toProps(): CampaignProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      status: this.status,
      priority: this.priority,
      ownerId: this.ownerId,
      goal: this.goal,
      budget: this.budget,
      target: this.target,
      metrics: this.metrics,
      audience: this.audience,
      channels: [...this.channels],
      lifecycle: this.lifecycle,
      tags: [...this.tags],
      metadata: { ...this.metadata },
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }
}
