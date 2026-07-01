import { randomUUID } from 'crypto';
import { CreativePlan, CreativePlanStatus } from '../domain/models/CreativePlan';
import { ContentBrief } from '../domain/models/ContentBrief';
import { PromptPackage } from '../domain/models/PromptPackage';
import type { CreativeStrategy } from '../domain/models/CreativeStrategy';
import type { ProductionPlan } from '../domain/models/ProductionPlan';
import type { ICreativeRepository } from '../domain/repositories/ICreativeRepository';
import type { StrategySelector } from '../strategy/StrategySelector';
import type { StrategyDecision } from '../strategy/StrategySelector';
import type { PromptBuilder } from '../prompts/PromptBuilder';
import type { ProductionPlanner } from '../planning/ProductionPlanner';
import { CreativeGoal, Platform } from '../domain/types';
import { CREATIVE_EVENT_TYPES } from '../events/CreativeEvents';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IMetricsService } from '../../core/metrics/IMetricsService';
import type { ILogger } from '../../shared/logger/ILogger';
import type { Campaign } from '../../campaign/domain/models/Campaign';
import { CampaignGoalType } from '../../campaign/domain/models/CampaignGoal';
import type { InvestmentDecision } from '../../revenue/domain/models/InvestmentDecision';
import { NotFoundError } from '../../shared/errors/AppError';

export interface GenerateCreativePlanInput {
  campaign: Campaign;
  primaryPlatform: Platform;
  additionalPlatforms?: Platform[];
  investmentDecision?: InvestmentDecision;
}

const GOAL_MAP: Record<CampaignGoalType, CreativeGoal> = {
  [CampaignGoalType.Revenue]: CreativeGoal.AffiliateSales,
  [CampaignGoalType.Leads]: CreativeGoal.LeadGeneration,
  [CampaignGoalType.Traffic]: CreativeGoal.BrandAwareness,
  [CampaignGoalType.Subscribers]: CreativeGoal.CommunityGrowth,
  [CampaignGoalType.BrandAwareness]: CreativeGoal.BrandAwareness,
  [CampaignGoalType.Sales]: CreativeGoal.ProductLaunch,
  [CampaignGoalType.Affiliate]: CreativeGoal.AffiliateSales,
  [CampaignGoalType.SaaS]: CreativeGoal.SaaSConversion,
  [CampaignGoalType.CourseSales]: CreativeGoal.Education,
};

export class CreativeIntelligenceService {
  private readonly logger: ILogger;

  constructor(
    private readonly repository: ICreativeRepository,
    private readonly strategySelector: StrategySelector,
    private readonly promptBuilder: PromptBuilder,
    private readonly productionPlanner: ProductionPlanner,
    private readonly eventBus: IEventBus,
    private readonly metricsService: IMetricsService,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'CreativeIntelligenceService' });
  }

  async generateCreativePlan(input: GenerateCreativePlanInput): Promise<CreativePlan> {
    const { campaign, primaryPlatform, additionalPlatforms = [], investmentDecision } = input;
    const startTime = Date.now();
    const planId = randomUUID();

    this.logger.info({ campaignId: campaign.id, platform: primaryPlatform }, 'Generating creative plan');

    const goal = GOAL_MAP[campaign.goal.goalType] ?? CreativeGoal.BrandAwareness;

    const contentBrief = ContentBrief.create({
      topic: campaign.name,
      goal,
      primaryPlatform,
      additionalPlatforms,
      targetAudience: campaign.audience.segments.join(', ') || 'general audience',
      keyMessages: [campaign.description, ...campaign.tags.slice(0, 4)].filter(Boolean),
      tone: 'engaging and authentic',
      callToAction: campaign.goal.description,
      keywords: [...campaign.tags],
      campaignType: campaign.type,
    });

    const strategy = this.chooseStrategy(campaign, goal, primaryPlatform);
    const decision = this.strategySelector.resolveContentTypeAndLength(goal, primaryPlatform);
    const productionPlan = this.generateProductionPlan(contentBrief, strategy, decision);
    const promptPackage = this.generatePromptPackage(planId, contentBrief, strategy, productionPlan);

    const plan = CreativePlan.reconstitute({
      id: planId,
      campaignId: campaign.id,
      investmentDecisionId: investmentDecision?.id ?? null,
      status: CreativePlanStatus.Draft,
      contentBrief,
      strategy,
      promptPackage,
      productionPlan,
      generatedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    });

    const saved = await this.repository.save(plan);
    await this.publishPlanEvents(saved);

    const duration = Date.now() - startTime;
    this.metricsService.recordExecutionTime(duration);
    this.logger.info(
      { planId: saved.id, campaignId: campaign.id, strategy: saved.strategy.strategyType, durationMs: duration },
      'Creative plan generated',
    );

    return saved;
  }

  chooseStrategy(campaign: Campaign, goal: CreativeGoal, platform: Platform): CreativeStrategy {
    return this.strategySelector.selectStrategy(goal, platform, campaign.type);
  }

  generatePromptPackage(
    planId: string,
    brief: ContentBrief,
    strategy: CreativeStrategy,
    productionPlan: ProductionPlan,
  ): PromptPackage {
    return this.promptBuilder.buildPromptPackage(planId, brief, strategy, productionPlan.scriptPlan);
  }

  generateProductionPlan(
    brief: ContentBrief,
    strategy: CreativeStrategy,
    decision: StrategyDecision,
  ): ProductionPlan {
    return this.productionPlanner.buildProductionPlan(brief, strategy, decision);
  }

  async optimizeForPlatform(planId: string, platform: Platform): Promise<CreativePlan> {
    const existing = await this.findOrThrow(planId);
    const brief = existing.contentBrief;
    const goal = brief.goal;

    const newBrief = ContentBrief.create({
      topic: brief.topic,
      goal,
      primaryPlatform: platform,
      additionalPlatforms: [],
      targetAudience: brief.targetAudience,
      keyMessages: [...brief.keyMessages],
      tone: brief.tone,
      callToAction: brief.callToAction,
      keywords: [...brief.keywords],
      campaignType: brief.campaignType,
    });

    const newStrategy = this.strategySelector.selectStrategy(goal, platform, brief.campaignType);
    const newDecision = this.strategySelector.resolveContentTypeAndLength(goal, platform);
    const newProductionPlan = this.generateProductionPlan(newBrief, newStrategy, newDecision);
    const newPromptPackage = this.generatePromptPackage(planId, newBrief, newStrategy, newProductionPlan);

    const updated = CreativePlan.reconstitute({
      id: existing.id,
      campaignId: existing.campaignId,
      investmentDecisionId: existing.investmentDecisionId,
      status: existing.status,
      contentBrief: newBrief,
      strategy: newStrategy,
      promptPackage: newPromptPackage,
      productionPlan: newProductionPlan,
      generatedAt: existing.generatedAt,
      approvedAt: existing.approvedAt,
      rejectedAt: existing.rejectedAt,
      rejectionReason: existing.rejectionReason,
    });

    return this.repository.save(updated);
  }

  async approvePlan(planId: string): Promise<CreativePlan> {
    const plan = await this.findOrThrow(planId);
    const approved = plan.approve();
    const saved = await this.repository.save(approved);
    await this.eventBus.publish(
      createDomainEvent(CREATIVE_EVENT_TYPES.PlanApproved, saved.id, {
        planId: saved.id,
        campaignId: saved.campaignId,
      }),
    );
    return saved;
  }

  async rejectPlan(planId: string, reason: string): Promise<CreativePlan> {
    const plan = await this.findOrThrow(planId);
    const rejected = plan.reject(reason);
    const saved = await this.repository.save(rejected);
    await this.eventBus.publish(
      createDomainEvent(CREATIVE_EVENT_TYPES.PlanRejected, saved.id, {
        planId: saved.id,
        campaignId: saved.campaignId,
        reason,
      }),
    );
    return saved;
  }

  private async findOrThrow(planId: string): Promise<CreativePlan> {
    const plan = await this.repository.findById(planId);
    if (plan === null) {
      throw new NotFoundError('CreativePlan', planId);
    }
    return plan;
  }

  private async publishPlanEvents(plan: CreativePlan): Promise<void> {
    await this.eventBus.publish(
      createDomainEvent(CREATIVE_EVENT_TYPES.PlanGenerated, plan.id, {
        campaignId: plan.campaignId,
        strategyType: plan.strategy.strategyType,
        promptCount: plan.promptPackage.totalPromptCount(),
        platformCount: plan.productionPlan.targetPlatformCount(),
      }),
    );

    await this.eventBus.publish(
      createDomainEvent(CREATIVE_EVENT_TYPES.PromptPackageCreated, plan.id, {
        planId: plan.id,
        llmPromptCount: plan.promptPackage.llmPrompts.length,
        imagePromptCount: plan.promptPackage.imagePrompts.length,
        videoPromptCount: plan.promptPackage.videoPrompts.length,
        voicePromptCount: plan.promptPackage.voicePrompts.length,
        musicPromptCount: plan.promptPackage.musicPrompts.length,
      }),
    );

    await this.eventBus.publish(
      createDomainEvent(CREATIVE_EVENT_TYPES.ProductionPlanCreated, plan.id, {
        planId: plan.id,
        sceneCount: plan.productionPlan.scriptPlan.sceneCount(),
        estimatedProductionDays: plan.productionPlan.estimatedProductionDays,
        platformCount: plan.productionPlan.targetPlatformCount(),
      }),
    );
  }
}
