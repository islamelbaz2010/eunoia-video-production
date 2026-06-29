import { AppError } from '../../../shared/errors/AppError';

export interface CostModelProps {
  aiGenerationCost: number;
  voiceGenerationCost: number;
  imageGenerationCost: number;
  videoGenerationCost: number;
  editingCost: number;
  publishingCost: number;
  advertisingCost: number;
  humanReviewCost: number;
  infrastructureCost: number;
}

export enum CostCategory {
  AiGeneration = 'ai_generation',
  VoiceGeneration = 'voice_generation',
  ImageGeneration = 'image_generation',
  VideoGeneration = 'video_generation',
  Editing = 'editing',
  Publishing = 'publishing',
  Advertising = 'advertising',
  HumanReview = 'human_review',
  Infrastructure = 'infrastructure',
}

export class CostModel {
  readonly aiGenerationCost: number;
  readonly voiceGenerationCost: number;
  readonly imageGenerationCost: number;
  readonly videoGenerationCost: number;
  readonly editingCost: number;
  readonly publishingCost: number;
  readonly advertisingCost: number;
  readonly humanReviewCost: number;
  readonly infrastructureCost: number;
  readonly total: number;

  private constructor(props: CostModelProps) {
    this.aiGenerationCost = props.aiGenerationCost;
    this.voiceGenerationCost = props.voiceGenerationCost;
    this.imageGenerationCost = props.imageGenerationCost;
    this.videoGenerationCost = props.videoGenerationCost;
    this.editingCost = props.editingCost;
    this.publishingCost = props.publishingCost;
    this.advertisingCost = props.advertisingCost;
    this.humanReviewCost = props.humanReviewCost;
    this.infrastructureCost = props.infrastructureCost;
    this.total = this.computeTotal();
  }

  static create(props: CostModelProps): CostModel {
    const values = Object.values(props);
    if (values.some(v => v < 0)) {
      throw new AppError('Cost values cannot be negative', 'VALIDATION_ERROR');
    }
    return new CostModel(props);
  }

  static zero(): CostModel {
    return new CostModel({
      aiGenerationCost: 0,
      voiceGenerationCost: 0,
      imageGenerationCost: 0,
      videoGenerationCost: 0,
      editingCost: 0,
      publishingCost: 0,
      advertisingCost: 0,
      humanReviewCost: 0,
      infrastructureCost: 0,
    });
  }

  breakdown(): Readonly<Record<CostCategory, number>> {
    return Object.freeze({
      [CostCategory.AiGeneration]: this.aiGenerationCost,
      [CostCategory.VoiceGeneration]: this.voiceGenerationCost,
      [CostCategory.ImageGeneration]: this.imageGenerationCost,
      [CostCategory.VideoGeneration]: this.videoGenerationCost,
      [CostCategory.Editing]: this.editingCost,
      [CostCategory.Publishing]: this.publishingCost,
      [CostCategory.Advertising]: this.advertisingCost,
      [CostCategory.HumanReview]: this.humanReviewCost,
      [CostCategory.Infrastructure]: this.infrastructureCost,
    });
  }

  private computeTotal(): number {
    return (
      this.aiGenerationCost +
      this.voiceGenerationCost +
      this.imageGenerationCost +
      this.videoGenerationCost +
      this.editingCost +
      this.publishingCost +
      this.advertisingCost +
      this.humanReviewCost +
      this.infrastructureCost
    );
  }
}
