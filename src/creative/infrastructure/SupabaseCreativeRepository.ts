import type { SupabaseClient } from '@supabase/supabase-js';
import { CreativePlan, CreativePlanStatus } from '../domain/models/CreativePlan';
import { ContentBrief } from '../domain/models/ContentBrief';
import { CreativeStrategy } from '../domain/models/CreativeStrategy';
import { PromptPackage } from '../domain/models/PromptPackage';
import { ScriptPlan } from '../domain/models/ScriptPlan';
import { ThumbnailPlan } from '../domain/models/ThumbnailPlan';
import { VoicePlan } from '../domain/models/VoicePlan';
import { MusicPlan } from '../domain/models/MusicPlan';
import { PlatformPlan } from '../domain/models/PlatformPlan';
import { ProductionPlan } from '../domain/models/ProductionPlan';
import type {
  ICreativeRepository,
  CreativeFilter,
  CreativePatch,
} from '../domain/repositories/ICreativeRepository';
import type { ILogger } from '../../shared/logger/ILogger';
import { NotFoundError, RepositoryError } from '../../shared/errors/AppError';

interface CreativePlanRow {
  id: string;
  campaign_id: string;
  investment_decision_id: string | null;
  status: string;
  content_brief: Record<string, unknown>;
  strategy: Record<string, unknown>;
  prompt_package: Record<string, unknown>;
  production_plan: Record<string, unknown>;
  generated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseCreativeRepository implements ICreativeRepository {
  private static readonly TABLE = 'creative_plans';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: ILogger,
  ) {}

  async save(plan: CreativePlan): Promise<CreativePlan> {
    const row = this.toRow(plan);

    const { data, error } = await this.client
      .from(SupabaseCreativeRepository.TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, planId: plan.id }, 'Failed to save creative plan');
      throw new RepositoryError(`Failed to save creative plan: ${error.message}`);
    }

    return this.toDomain(data as CreativePlanRow);
  }

  async findById(id: string): Promise<CreativePlan | null> {
    const { data, error } = await this.client
      .from(SupabaseCreativeRepository.TABLE)
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to find creative plan');
      throw new RepositoryError(`Failed to find creative plan: ${error.message}`);
    }

    return data !== null ? this.toDomain(data as CreativePlanRow) : null;
  }

  async findByCampaignId(campaignId: string): Promise<CreativePlan[]> {
    return this.findAll({ campaignId });
  }

  async findAll(filter?: CreativeFilter): Promise<CreativePlan[]> {
    let query = this.client.from(SupabaseCreativeRepository.TABLE).select();

    if (filter !== undefined) {
      if (filter.campaignId !== undefined) {
        query = query.eq('campaign_id', filter.campaignId);
      }
      if (filter.status !== undefined) {
        query = query.eq('status', filter.status);
      }
      if (filter.since !== undefined) {
        query = query.gte('generated_at', filter.since.toISOString());
      }
      if (filter.offset !== undefined) {
        query = query.range(filter.offset, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);
      } else if (filter.limit !== undefined) {
        query = query.limit(filter.limit);
      }
    }

    const { data, error } = await query.order('generated_at', { ascending: false });

    if (error !== null) {
      this.logger.error({ error }, 'Failed to list creative plans');
      throw new RepositoryError(`Failed to list creative plans: ${error.message}`);
    }

    return (data as CreativePlanRow[]).map(row => this.toDomain(row));
  }

  async update(id: string, patch: CreativePatch): Promise<CreativePlan> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (patch.status !== undefined) updateData['status'] = patch.status;
    if ('approvedAt' in patch) updateData['approved_at'] = patch.approvedAt?.toISOString() ?? null;
    if ('rejectedAt' in patch) updateData['rejected_at'] = patch.rejectedAt?.toISOString() ?? null;
    if ('rejectionReason' in patch) updateData['rejection_reason'] = patch.rejectionReason ?? null;

    const { data, error } = await this.client
      .from(SupabaseCreativeRepository.TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to update creative plan');
      throw new RepositoryError(`Failed to update creative plan: ${error.message}`);
    }

    return this.toDomain(data as CreativePlanRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseCreativeRepository.TABLE)
      .delete()
      .eq('id', id);

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to delete creative plan');
      throw new RepositoryError(`Failed to delete creative plan: ${error.message}`);
    }
  }

  async count(filter?: CreativeFilter): Promise<number> {
    let query = this.client
      .from(SupabaseCreativeRepository.TABLE)
      .select('id', { count: 'exact', head: true });

    if (filter !== undefined) {
      if (filter.campaignId !== undefined) {
        query = query.eq('campaign_id', filter.campaignId);
      }
      if (filter.status !== undefined) {
        query = query.eq('status', filter.status);
      }
      if (filter.since !== undefined) {
        query = query.gte('generated_at', filter.since.toISOString());
      }
    }

    const result = await query;
    const { count, error } = result as { count: number | null; error: { message: string } | null };

    if (error !== null) {
      this.logger.error({ error }, 'Failed to count creative plans');
      throw new RepositoryError(`Failed to count creative plans: ${error.message}`);
    }

    return count ?? 0;
  }

  private toRow(plan: CreativePlan): CreativePlanRow {
    return {
      id: plan.id,
      campaign_id: plan.campaignId,
      investment_decision_id: plan.investmentDecisionId,
      status: plan.status,
      content_brief: {
        topic: plan.contentBrief.topic,
        goal: plan.contentBrief.goal,
        primaryPlatform: plan.contentBrief.primaryPlatform,
        additionalPlatforms: plan.contentBrief.additionalPlatforms,
        targetAudience: plan.contentBrief.targetAudience,
        keyMessages: plan.contentBrief.keyMessages,
        tone: plan.contentBrief.tone,
        callToAction: plan.contentBrief.callToAction,
        keywords: plan.contentBrief.keywords,
        campaignType: plan.contentBrief.campaignType,
      },
      strategy: {
        strategyType: plan.strategy.strategyType,
        title: plan.strategy.title,
        description: plan.strategy.description,
        hookStrategy: plan.strategy.hookStrategy,
        storyStructure: plan.strategy.storyStructure,
        ctaStrategy: plan.strategy.ctaStrategy,
        visualStyle: plan.strategy.visualStyle,
        voiceStyle: plan.strategy.voiceStyle,
        musicMood: plan.strategy.musicMood,
        aiProviders: plan.strategy.aiProviders,
      },
      prompt_package: {
        planId: plan.promptPackage.planId,
        llmPrompts: plan.promptPackage.llmPrompts,
        imagePrompts: plan.promptPackage.imagePrompts,
        videoPrompts: plan.promptPackage.videoPrompts,
        voicePrompts: plan.promptPackage.voicePrompts,
        musicPrompts: plan.promptPackage.musicPrompts,
        generatedAt: plan.promptPackage.generatedAt.toISOString(),
      },
      production_plan: this.serializeProductionPlan(plan.productionPlan),
      generated_at: plan.generatedAt.toISOString(),
      approved_at: plan.approvedAt?.toISOString() ?? null,
      rejected_at: plan.rejectedAt?.toISOString() ?? null,
      rejection_reason: plan.rejectionReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private serializeProductionPlan(pp: ProductionPlan): Record<string, unknown> {
    return {
      scriptPlan: {
        scenes: pp.scriptPlan.scenes,
        totalDurationSeconds: pp.scriptPlan.totalDurationSeconds,
        language: pp.scriptPlan.language,
        voiceoverStyle: pp.scriptPlan.voiceoverStyle,
      },
      thumbnailPlan: {
        style: pp.thumbnailPlan.style,
        textOverlay: pp.thumbnailPlan.textOverlay,
        colorScheme: pp.thumbnailPlan.colorScheme,
        composition: pp.thumbnailPlan.composition,
        imagePrompt: pp.thumbnailPlan.imagePrompt,
        moodKeywords: pp.thumbnailPlan.moodKeywords,
      },
      voicePlan: {
        voiceStyle: pp.voicePlan.voiceStyle,
        tone: pp.voicePlan.tone,
        pacing: pp.voicePlan.pacing,
        language: pp.voicePlan.language,
        accent: pp.voicePlan.accent,
      },
      musicPlan: {
        mood: pp.musicPlan.mood,
        tempoBpm: pp.musicPlan.tempoBpm,
        genre: pp.musicPlan.genre,
        durationSeconds: pp.musicPlan.durationSeconds,
        energyLevel: pp.musicPlan.energyLevel,
      },
      platformPlans: pp.platformPlans.map(p => ({
        platform: p.platform,
        contentType: p.contentType,
        videoLength: p.videoLength,
        publishingPriority: p.publishingPriority,
        adaptations: p.adaptations,
      })),
      estimatedProductionDays: pp.estimatedProductionDays,
      productionOrder: pp.productionOrder,
    };
  }

  private toDomain(row: CreativePlanRow): CreativePlan {
    const b = row.content_brief;
    const s = row.strategy;
    const pkg = row.prompt_package;
    const pp = row.production_plan;

    const contentBrief = ContentBrief.create({
      topic: String(b['topic'] ?? ''),
      goal: b['goal'] as ReturnType<typeof ContentBrief.prototype['goal']['toString']> as any,
      primaryPlatform: b['primaryPlatform'] as any,
      additionalPlatforms: ((b['additionalPlatforms'] as string[] | undefined) ?? []) as any[],
      targetAudience: String(b['targetAudience'] ?? ''),
      keyMessages: (b['keyMessages'] as string[] | undefined) ?? [],
      tone: String(b['tone'] ?? ''),
      callToAction: String(b['callToAction'] ?? ''),
      keywords: (b['keywords'] as string[] | undefined) ?? [],
      campaignType: b['campaignType'] as any,
    });

    const strategy = CreativeStrategy.create({
      strategyType: s['strategyType'] as any,
      title: String(s['title'] ?? ''),
      description: String(s['description'] ?? ''),
      hookStrategy: s['hookStrategy'] as any,
      storyStructure: s['storyStructure'] as any,
      ctaStrategy: s['ctaStrategy'] as any,
      visualStyle: s['visualStyle'] as any,
      voiceStyle: s['voiceStyle'] as any,
      musicMood: s['musicMood'] as any,
      aiProviders: (s['aiProviders'] as Record<string, any>) ?? {},
    });

    const promptPackage = PromptPackage.reconstitute({
      planId: String(pkg['planId'] ?? row.id),
      llmPrompts: (pkg['llmPrompts'] as any[]) ?? [],
      imagePrompts: (pkg['imagePrompts'] as any[]) ?? [],
      videoPrompts: (pkg['videoPrompts'] as any[]) ?? [],
      voicePrompts: (pkg['voicePrompts'] as any[]) ?? [],
      musicPrompts: (pkg['musicPrompts'] as any[]) ?? [],
      generatedAt: new Date(String(pkg['generatedAt'] ?? row.generated_at)),
    });

    const scriptData = (pp['scriptPlan'] as Record<string, unknown>) ?? {};
    const scriptPlan = ScriptPlan.create({
      scenes: (scriptData['scenes'] as any[]) ?? [],
      totalDurationSeconds: Number(scriptData['totalDurationSeconds'] ?? 0),
      language: String(scriptData['language'] ?? 'en'),
      voiceoverStyle: scriptData['voiceoverStyle'] as any,
    });

    const tData = (pp['thumbnailPlan'] as Record<string, unknown>) ?? {};
    const thumbnailPlan = ThumbnailPlan.create({
      style: tData['style'] as any,
      textOverlay: String(tData['textOverlay'] ?? ''),
      colorScheme: (tData['colorScheme'] as string[]) ?? [],
      composition: String(tData['composition'] ?? ''),
      imagePrompt: String(tData['imagePrompt'] ?? ''),
      moodKeywords: (tData['moodKeywords'] as string[]) ?? [],
    });

    const vData = (pp['voicePlan'] as Record<string, unknown>) ?? {};
    const voicePlan = VoicePlan.create({
      voiceStyle: vData['voiceStyle'] as any,
      tone: String(vData['tone'] ?? ''),
      pacing: (vData['pacing'] ?? 'medium') as any,
      language: String(vData['language'] ?? 'en'),
      accent: vData['accent'] as string | null,
    });

    const mData = (pp['musicPlan'] as Record<string, unknown>) ?? {};
    const musicPlan = MusicPlan.create({
      mood: mData['mood'] as any,
      tempoBpm: Number(mData['tempoBpm'] ?? 120),
      genre: String(mData['genre'] ?? 'ambient'),
      durationSeconds: Number(mData['durationSeconds'] ?? 60),
      energyLevel: Number(mData['energyLevel'] ?? 60),
    });

    const platformPlans = ((pp['platformPlans'] as any[]) ?? []).map((p: any) =>
      PlatformPlan.create({
        platform: p['platform'],
        contentType: p['contentType'],
        videoLength: p['videoLength'],
        publishingPriority: Number(p['publishingPriority'] ?? 1),
        adaptations: (p['adaptations'] as string[]) ?? [],
      }),
    );

    const productionPlan = ProductionPlan.create({
      scriptPlan,
      thumbnailPlan,
      voicePlan,
      musicPlan,
      platformPlans,
      estimatedProductionDays: Number(pp['estimatedProductionDays'] ?? 3),
      productionOrder: (pp['productionOrder'] as string[]) ?? [],
    });

    return CreativePlan.reconstitute({
      id: row.id,
      campaignId: row.campaign_id,
      investmentDecisionId: row.investment_decision_id,
      status: row.status as CreativePlanStatus,
      contentBrief,
      strategy,
      promptPackage,
      productionPlan,
      generatedAt: new Date(row.generated_at),
      approvedAt: row.approved_at !== null ? new Date(row.approved_at) : null,
      rejectedAt: row.rejected_at !== null ? new Date(row.rejected_at) : null,
      rejectionReason: row.rejection_reason,
    });
  }
}
