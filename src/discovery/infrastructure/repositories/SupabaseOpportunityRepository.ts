import type { SupabaseClient } from '@supabase/supabase-js';
import { Opportunity, OpportunityStatus } from '../../domain/models/Opportunity';
import { OpportunityScore } from '../../domain/models/OpportunityScore';
import type { DiscoverySource } from '../../domain/providers/IDiscoveryProvider';
import type {
  IOpportunityRepository,
  OpportunityFilter,
  OpportunityPatch,
} from '../../domain/repositories/IOpportunityRepository';
import type { ILogger } from '../../../shared/logger/ILogger';
import { NotFoundError, RepositoryError } from '../../../shared/errors/AppError';

interface OpportunityRow {
  id: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  score_relevance: number;
  score_engagement: number;
  score_timeliness: number;
  score_competition: number;
  score_total: number;
  keywords: string[];
  metadata: Record<string, unknown>;
  status: string;
  published_at: string | null;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseOpportunityRepository implements IOpportunityRepository {
  private static readonly TABLE = 'opportunities';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: ILogger,
  ) {}

  async save(opportunity: Opportunity): Promise<Opportunity> {
    const row = this.toRow(opportunity);

    const { data, error } = await this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, id: opportunity.id }, 'Failed to save opportunity');
      throw new RepositoryError(`Failed to save opportunity: ${error.message}`);
    }

    return this.toDomain(data as OpportunityRow);
  }

  async findById(id: string): Promise<Opportunity | null> {
    const { data, error } = await this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to find opportunity by id');
      throw new RepositoryError(`Failed to find opportunity: ${error.message}`);
    }

    return data !== null ? this.toDomain(data as OpportunityRow) : null;
  }

  async findAll(filter?: OpportunityFilter): Promise<Opportunity[]> {
    let query = this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .select('*')
      .order('score_total', { ascending: false });

    if (filter?.status !== undefined) {
      query = query.eq('status', filter.status);
    }
    if (filter?.source !== undefined) {
      query = query.eq('source', filter.source);
    }
    if (filter?.minScore !== undefined) {
      query = query.gte('score_total', filter.minScore);
    }
    if (filter?.since !== undefined) {
      query = query.gte('discovered_at', filter.since.toISOString());
    }
    if (filter?.limit !== undefined) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset !== undefined && filter.limit !== undefined) {
      query = query.range(filter.offset, filter.offset + filter.limit - 1);
    }

    const { data, error } = await query;

    if (error !== null) {
      this.logger.error({ error }, 'Failed to fetch opportunities');
      throw new RepositoryError(`Failed to fetch opportunities: ${error.message}`);
    }

    return ((data as OpportunityRow[]) ?? []).map(row => this.toDomain(row));
  }

  async update(id: string, patch: OpportunityPatch): Promise<Opportunity> {
    const updateData: Partial<OpportunityRow> = {};
    if (patch.status !== undefined) {
      updateData.status = patch.status;
    }

    const { data, error } = await this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to update opportunity');
      throw new RepositoryError(`Failed to update opportunity ${id}: ${error.message}`);
    }

    if (data === null) {
      throw new NotFoundError('Opportunity', id);
    }

    return this.toDomain(data as OpportunityRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .delete()
      .eq('id', id);

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to delete opportunity');
      throw new RepositoryError(`Failed to delete opportunity ${id}: ${error.message}`);
    }
  }

  async count(filter?: OpportunityFilter): Promise<number> {
    let query = this.client
      .from(SupabaseOpportunityRepository.TABLE)
      .select('id', { count: 'exact', head: true });

    if (filter?.status !== undefined) {
      query = query.eq('status', filter.status);
    }
    if (filter?.source !== undefined) {
      query = query.eq('source', filter.source);
    }
    if (filter?.minScore !== undefined) {
      query = query.gte('score_total', filter.minScore);
    }
    if (filter?.since !== undefined) {
      query = query.gte('discovered_at', filter.since.toISOString());
    }

    const { count, error } = await query;

    if (error !== null) {
      this.logger.error({ error }, 'Failed to count opportunities');
      throw new RepositoryError(`Failed to count opportunities: ${error.message}`);
    }

    return count ?? 0;
  }

  private toRow(opportunity: Opportunity): OpportunityRow {
    return {
      id: opportunity.id,
      title: opportunity.title,
      summary: opportunity.summary,
      source: opportunity.source,
      source_url: opportunity.sourceUrl,
      score_relevance: opportunity.score.relevance,
      score_engagement: opportunity.score.engagement,
      score_timeliness: opportunity.score.timeliness,
      score_competition: opportunity.score.competition,
      score_total: opportunity.score.total,
      keywords: [...opportunity.keywords],
      metadata: { ...opportunity.metadata },
      status: opportunity.status,
      published_at: opportunity.publishedAt?.toISOString() ?? null,
      discovered_at: opportunity.discoveredAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private toDomain(row: OpportunityRow): Opportunity {
    return Opportunity.reconstitute({
      id: row.id,
      title: row.title,
      summary: row.summary,
      source: row.source as DiscoverySource,
      sourceUrl: row.source_url,
      score: OpportunityScore.create({
        relevance: row.score_relevance,
        engagement: row.score_engagement,
        timeliness: row.score_timeliness,
        competition: row.score_competition,
      }),
      keywords: row.keywords,
      metadata: row.metadata,
      status: row.status as OpportunityStatus,
      publishedAt: row.published_at !== null ? new Date(row.published_at) : null,
      discoveredAt: new Date(row.discovered_at),
    });
  }
}
