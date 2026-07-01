import { AppError } from '../../../shared/errors/AppError';
import type { Platform, ContentType, VideoLength } from '../types';

export interface PlatformPlanProps {
  platform: Platform;
  contentType: ContentType;
  videoLength: VideoLength;
  publishingPriority: number;
  adaptations: string[];
}

export class PlatformPlan {
  readonly platform: Platform;
  readonly contentType: ContentType;
  readonly videoLength: VideoLength;
  readonly publishingPriority: number;
  readonly adaptations: ReadonlyArray<string>;

  private constructor(props: PlatformPlanProps) {
    this.platform = props.platform;
    this.contentType = props.contentType;
    this.videoLength = props.videoLength;
    this.publishingPriority = props.publishingPriority;
    this.adaptations = Object.freeze([...props.adaptations]);
  }

  static create(props: PlatformPlanProps): PlatformPlan {
    if (props.publishingPriority < 1) {
      throw new AppError('Publishing priority must be >= 1', 'VALIDATION_ERROR');
    }
    return new PlatformPlan(props);
  }

  isPrimary(): boolean {
    return this.publishingPriority === 1;
  }
}
