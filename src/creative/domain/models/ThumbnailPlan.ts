import type { ThumbnailStyle } from '../types';

export interface ThumbnailPlanProps {
  style: ThumbnailStyle;
  textOverlay: string;
  colorScheme: string[];
  composition: string;
  imagePrompt: string;
  moodKeywords: string[];
}

export class ThumbnailPlan {
  readonly style: ThumbnailStyle;
  readonly textOverlay: string;
  readonly colorScheme: ReadonlyArray<string>;
  readonly composition: string;
  readonly imagePrompt: string;
  readonly moodKeywords: ReadonlyArray<string>;

  private constructor(props: ThumbnailPlanProps) {
    this.style = props.style;
    this.textOverlay = props.textOverlay;
    this.colorScheme = Object.freeze([...props.colorScheme]);
    this.composition = props.composition;
    this.imagePrompt = props.imagePrompt;
    this.moodKeywords = Object.freeze([...props.moodKeywords]);
  }

  static create(props: ThumbnailPlanProps): ThumbnailPlan {
    return new ThumbnailPlan(props);
  }

  hasTextOverlay(): boolean {
    return this.textOverlay.trim().length > 0;
  }
}
