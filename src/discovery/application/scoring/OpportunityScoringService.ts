import { OpportunityScore } from '../../domain/models/OpportunityScore';
import type { FetchParams, RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { IOpportunityScoringService } from './IOpportunityScoringService';

export class OpportunityScoringService implements IOpportunityScoringService {
  score(raw: RawOpportunity, params: FetchParams): OpportunityScore {
    return OpportunityScore.create({
      relevance: this.computeRelevance(raw, params),
      engagement: this.computeEngagement(raw),
      timeliness: this.computeTimeliness(raw.publishedAt),
      competition: this.computeCompetition(raw),
    });
  }

  private computeRelevance(raw: RawOpportunity, params: FetchParams): number {
    const keywords = params.keywords ?? [];
    if (keywords.length === 0) return 50;

    const text = `${raw.title} ${raw.summary}`.toLowerCase();
    const matchCount = keywords.filter(k => text.includes(k.toLowerCase())).length;
    return Math.min(100, Math.round((matchCount / keywords.length) * 100));
  }

  private computeEngagement(raw: RawOpportunity): number {
    const views = this.numericMeta(raw.metadata, 'views');
    const likes = this.numericMeta(raw.metadata, 'likes');
    const comments = this.numericMeta(raw.metadata, 'comments');
    const upvotes = this.numericMeta(raw.metadata, 'upvotes');

    const signal = views * 0.001 + likes * 0.01 + comments * 0.05 + upvotes * 0.02;
    return Math.min(100, Math.round(signal));
  }

  private computeTimeliness(publishedAt: Date | null): number {
    if (publishedAt === null) return 30;

    const ageDays = (Date.now() - publishedAt.getTime()) / 86_400_000;

    if (ageDays <= 1) return 100;
    if (ageDays <= 7) return Math.max(0, Math.round(90 - (ageDays - 1) * 5));
    if (ageDays <= 30) return Math.max(0, Math.round(60 - (ageDays - 7) * 1.5));
    return Math.max(0, Math.round(30 - ageDays * 0.5));
  }

  private computeCompetition(raw: RawOpportunity): number {
    const score = this.numericMeta(raw.metadata, 'competitionScore');
    return score > 0 ? Math.min(100, Math.round(score)) : 50;
  }

  private numericMeta(meta: Record<string, unknown>, key: string): number {
    const value = meta[key];
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}
