import { AppError } from '../../../shared/errors/AppError';
import type { CreativeGoal, Platform } from '../types';
import type { CampaignType } from '../../../campaign/domain/models/Campaign';

export interface ContentBriefProps {
  topic: string;
  goal: CreativeGoal;
  primaryPlatform: Platform;
  additionalPlatforms: Platform[];
  targetAudience: string;
  keyMessages: string[];
  tone: string;
  callToAction: string;
  keywords: string[];
  campaignType: CampaignType;
}

export class ContentBrief {
  readonly topic: string;
  readonly goal: CreativeGoal;
  readonly primaryPlatform: Platform;
  readonly additionalPlatforms: ReadonlyArray<Platform>;
  readonly targetAudience: string;
  readonly keyMessages: ReadonlyArray<string>;
  readonly tone: string;
  readonly callToAction: string;
  readonly keywords: ReadonlyArray<string>;
  readonly campaignType: CampaignType;

  private constructor(props: ContentBriefProps) {
    this.topic = props.topic;
    this.goal = props.goal;
    this.primaryPlatform = props.primaryPlatform;
    this.additionalPlatforms = Object.freeze([...props.additionalPlatforms]);
    this.targetAudience = props.targetAudience;
    this.keyMessages = Object.freeze([...props.keyMessages.slice(0, 5)]);
    this.tone = props.tone;
    this.callToAction = props.callToAction;
    this.keywords = Object.freeze([...props.keywords]);
    this.campaignType = props.campaignType;
  }

  static create(props: ContentBriefProps): ContentBrief {
    if (!props.topic.trim()) {
      throw new AppError('Content brief topic cannot be empty', 'VALIDATION_ERROR');
    }
    if (!props.targetAudience.trim()) {
      throw new AppError('Content brief target audience cannot be empty', 'VALIDATION_ERROR');
    }
    return new ContentBrief(props);
  }

  allPlatforms(): ReadonlyArray<Platform> {
    return Object.freeze([this.primaryPlatform, ...this.additionalPlatforms]);
  }

  isMultiPlatform(): boolean {
    return this.additionalPlatforms.length > 0;
  }
}
