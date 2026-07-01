import { randomUUID } from 'crypto';
import type { ContentBrief } from './ContentBrief';
import type { CreativeStrategy } from './CreativeStrategy';
import type { PromptPackage } from './PromptPackage';
import type { ProductionPlan } from './ProductionPlan';
import { CreativePlanStatus } from '../types';
import { AppError } from '../../../shared/errors/AppError';

export { CreativePlanStatus } from '../types';

export interface CreativePlanProps {
  id: string;
  campaignId: string;
  investmentDecisionId: string | null;
  status: CreativePlanStatus;
  contentBrief: ContentBrief;
  strategy: CreativeStrategy;
  promptPackage: PromptPackage;
  productionPlan: ProductionPlan;
  generatedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

export type CreateCreativePlanProps = Omit<
  CreativePlanProps,
  'id' | 'status' | 'generatedAt' | 'approvedAt' | 'rejectedAt' | 'rejectionReason'
>;

export class CreativePlan {
  readonly id: string;
  readonly campaignId: string;
  readonly investmentDecisionId: string | null;
  readonly status: CreativePlanStatus;
  readonly contentBrief: ContentBrief;
  readonly strategy: CreativeStrategy;
  readonly promptPackage: PromptPackage;
  readonly productionPlan: ProductionPlan;
  readonly generatedAt: Date;
  readonly approvedAt: Date | null;
  readonly rejectedAt: Date | null;
  readonly rejectionReason: string | null;

  private constructor(props: CreativePlanProps) {
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.investmentDecisionId = props.investmentDecisionId;
    this.status = props.status;
    this.contentBrief = props.contentBrief;
    this.strategy = props.strategy;
    this.promptPackage = props.promptPackage;
    this.productionPlan = props.productionPlan;
    this.generatedAt = new Date(props.generatedAt);
    this.approvedAt = props.approvedAt !== null ? new Date(props.approvedAt) : null;
    this.rejectedAt = props.rejectedAt !== null ? new Date(props.rejectedAt) : null;
    this.rejectionReason = props.rejectionReason;
  }

  static create(props: CreateCreativePlanProps): CreativePlan {
    return new CreativePlan({
      ...props,
      id: randomUUID(),
      status: CreativePlanStatus.Draft,
      generatedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    });
  }

  static reconstitute(props: CreativePlanProps): CreativePlan {
    return new CreativePlan(props);
  }

  approve(): CreativePlan {
    if (this.status === CreativePlanStatus.Rejected) {
      throw new AppError('Cannot approve a rejected plan', 'CREATIVE_PLAN_ALREADY_REJECTED');
    }
    return CreativePlan.reconstitute({
      ...this.toProps(),
      status: CreativePlanStatus.Approved,
      approvedAt: new Date(),
    });
  }

  reject(reason: string): CreativePlan {
    if (this.status === CreativePlanStatus.InProduction) {
      throw new AppError('Cannot reject a plan already in production', 'CREATIVE_PLAN_IN_PRODUCTION');
    }
    return CreativePlan.reconstitute({
      ...this.toProps(),
      status: CreativePlanStatus.Rejected,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
  }

  startProduction(): CreativePlan {
    if (this.status !== CreativePlanStatus.Approved) {
      throw new AppError('Plan must be approved before production', 'CREATIVE_PLAN_NOT_APPROVED');
    }
    return CreativePlan.reconstitute({
      ...this.toProps(),
      status: CreativePlanStatus.InProduction,
    });
  }

  isActive(): boolean {
    return (
      this.status === CreativePlanStatus.Approved ||
      this.status === CreativePlanStatus.InProduction
    );
  }

  private toProps(): CreativePlanProps {
    return {
      id: this.id,
      campaignId: this.campaignId,
      investmentDecisionId: this.investmentDecisionId,
      status: this.status,
      contentBrief: this.contentBrief,
      strategy: this.strategy,
      promptPackage: this.promptPackage,
      productionPlan: this.productionPlan,
      generatedAt: new Date(this.generatedAt),
      approvedAt: this.approvedAt !== null ? new Date(this.approvedAt) : null,
      rejectedAt: this.rejectedAt !== null ? new Date(this.rejectedAt) : null,
      rejectionReason: this.rejectionReason,
    };
  }
}
