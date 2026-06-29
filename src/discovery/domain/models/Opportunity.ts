import { randomUUID } from 'crypto';
import type { DiscoverySource } from '../providers/IDiscoveryProvider';
import type { OpportunityScore } from './OpportunityScore';

export enum OpportunityStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface OpportunityProps {
  id: string;
  title: string;
  summary: string;
  source: DiscoverySource;
  sourceUrl: string;
  score: OpportunityScore;
  keywords: string[];
  metadata: Record<string, unknown>;
  status: OpportunityStatus;
  publishedAt: Date | null;
  discoveredAt: Date;
}

export type CreateOpportunityProps = Omit<OpportunityProps, 'id' | 'status' | 'discoveredAt'>;

export class Opportunity {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly source: DiscoverySource;
  readonly sourceUrl: string;
  readonly score: OpportunityScore;
  readonly keywords: ReadonlyArray<string>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly status: OpportunityStatus;
  readonly publishedAt: Date | null;
  readonly discoveredAt: Date;

  private constructor(props: OpportunityProps) {
    this.id = props.id;
    this.title = props.title;
    this.summary = props.summary;
    this.source = props.source;
    this.sourceUrl = props.sourceUrl;
    this.score = props.score;
    this.keywords = Object.freeze([...props.keywords]);
    this.metadata = Object.freeze({ ...props.metadata });
    this.status = props.status;
    this.publishedAt = props.publishedAt;
    this.discoveredAt = new Date(props.discoveredAt);
  }

  static create(props: CreateOpportunityProps): Opportunity {
    return new Opportunity({
      ...props,
      id: randomUUID(),
      status: OpportunityStatus.NEW,
      discoveredAt: new Date(),
    });
  }

  static reconstitute(props: OpportunityProps): Opportunity {
    return new Opportunity(props);
  }

  withStatus(status: OpportunityStatus): Opportunity {
    return Opportunity.reconstitute({
      id: this.id,
      title: this.title,
      summary: this.summary,
      source: this.source,
      sourceUrl: this.sourceUrl,
      score: this.score,
      keywords: [...this.keywords],
      metadata: { ...this.metadata },
      status,
      publishedAt: this.publishedAt,
      discoveredAt: new Date(this.discoveredAt),
    });
  }

  isHighValue(threshold = 70): boolean {
    return this.score.total >= threshold;
  }
}
