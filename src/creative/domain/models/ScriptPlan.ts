import type { VoiceStyle } from '../types';

export interface SceneDescription {
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly durationSeconds: number;
  readonly visualCue: string;
  readonly voiceoverText: string;
}

export interface ScriptPlanProps {
  scenes: SceneDescription[];
  totalDurationSeconds: number;
  language: string;
  voiceoverStyle: VoiceStyle;
}

export class ScriptPlan {
  readonly scenes: ReadonlyArray<SceneDescription>;
  readonly totalDurationSeconds: number;
  readonly language: string;
  readonly voiceoverStyle: VoiceStyle;

  private constructor(props: ScriptPlanProps) {
    this.scenes = Object.freeze([...props.scenes]);
    this.totalDurationSeconds = props.totalDurationSeconds;
    this.language = props.language;
    this.voiceoverStyle = props.voiceoverStyle;
  }

  static create(props: ScriptPlanProps): ScriptPlan {
    return new ScriptPlan(props);
  }

  sceneCount(): number {
    return this.scenes.length;
  }

  totalDurationMinutes(): number {
    return Math.round((this.totalDurationSeconds / 60) * 10) / 10;
  }
}
