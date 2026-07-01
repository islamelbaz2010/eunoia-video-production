import { randomUUID } from 'crypto';
import type { TitleCandidate } from './TitleCandidate';
import type { Chapter } from './Chapter';

export interface VideoMetadataDraftProps {
  id: string;
  assetId: string;
  titleCandidates: TitleCandidate[];
  descriptionDraft: string;
  tags: string[];
  chapters: Chapter[];
  acceptedTitle: string | null;
  acceptedDescription: string | null;
  acceptedTags: string[] | null;
  acceptedChapters: Chapter[] | null;
  creatorReviewedAt: Date | null;
  generatedAt: Date;
  modelVersion: string;
}

export type CreateVideoMetadataDraftProps = Omit<
  VideoMetadataDraftProps,
  | 'id'
  | 'acceptedTitle'
  | 'acceptedDescription'
  | 'acceptedTags'
  | 'acceptedChapters'
  | 'creatorReviewedAt'
>;

export class VideoMetadataDraft {
  readonly id: string;
  readonly assetId: string;
  readonly titleCandidates: ReadonlyArray<TitleCandidate>;
  readonly descriptionDraft: string;
  readonly tags: ReadonlyArray<string>;
  readonly chapters: ReadonlyArray<Chapter>;
  readonly acceptedTitle: string | null;
  readonly acceptedDescription: string | null;
  readonly acceptedTags: ReadonlyArray<string> | null;
  readonly acceptedChapters: ReadonlyArray<Chapter> | null;
  readonly creatorReviewedAt: Date | null;
  readonly generatedAt: Date;
  readonly modelVersion: string;

  private constructor(props: VideoMetadataDraftProps) {
    this.id = props.id;
    this.assetId = props.assetId;
    this.titleCandidates = Object.freeze([...props.titleCandidates]);
    this.descriptionDraft = props.descriptionDraft;
    this.tags = Object.freeze([...props.tags]);
    this.chapters = Object.freeze([...props.chapters]);
    this.acceptedTitle = props.acceptedTitle;
    this.acceptedDescription = props.acceptedDescription;
    this.acceptedTags = props.acceptedTags !== null ? Object.freeze([...props.acceptedTags]) : null;
    this.acceptedChapters =
      props.acceptedChapters !== null ? Object.freeze([...props.acceptedChapters]) : null;
    this.creatorReviewedAt =
      props.creatorReviewedAt !== null ? new Date(props.creatorReviewedAt) : null;
    this.generatedAt = new Date(props.generatedAt);
    this.modelVersion = props.modelVersion;
  }

  static create(props: CreateVideoMetadataDraftProps): VideoMetadataDraft {
    return new VideoMetadataDraft({
      ...props,
      id: randomUUID(),
      acceptedTitle: null,
      acceptedDescription: null,
      acceptedTags: null,
      acceptedChapters: null,
      creatorReviewedAt: null,
    });
  }

  static reconstitute(props: VideoMetadataDraftProps): VideoMetadataDraft {
    return new VideoMetadataDraft(props);
  }

  withAcceptance(
    title: string,
    description: string,
    tags: string[],
    chapters: Chapter[],
  ): VideoMetadataDraft {
    return new VideoMetadataDraft({
      id: this.id,
      assetId: this.assetId,
      titleCandidates: [...this.titleCandidates],
      descriptionDraft: this.descriptionDraft,
      tags: [...this.tags],
      chapters: [...this.chapters],
      acceptedTitle: title,
      acceptedDescription: description,
      acceptedTags: [...tags],
      acceptedChapters: [...chapters],
      creatorReviewedAt: new Date(),
      generatedAt: new Date(this.generatedAt),
      modelVersion: this.modelVersion,
    });
  }

  isAccepted(): boolean {
    return this.acceptedTitle !== null;
  }
}
