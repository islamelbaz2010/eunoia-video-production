import type { VoiceStyle } from '../types';

export type VoicePacing = 'slow' | 'medium' | 'fast';

export interface VoicePlanProps {
  voiceStyle: VoiceStyle;
  tone: string;
  pacing: VoicePacing;
  language: string;
  accent: string | null;
}

export class VoicePlan {
  readonly voiceStyle: VoiceStyle;
  readonly tone: string;
  readonly pacing: VoicePacing;
  readonly language: string;
  readonly accent: string | null;

  private constructor(props: VoicePlanProps) {
    this.voiceStyle = props.voiceStyle;
    this.tone = props.tone;
    this.pacing = props.pacing;
    this.language = props.language;
    this.accent = props.accent;
  }

  static create(props: VoicePlanProps): VoicePlan {
    return new VoicePlan(props);
  }

  isNeutralAccent(): boolean {
    return this.accent === null;
  }
}
