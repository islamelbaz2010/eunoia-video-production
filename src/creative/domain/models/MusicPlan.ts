import { AppError } from '../../../shared/errors/AppError';
import type { MusicMood } from '../types';

export interface MusicPlanProps {
  mood: MusicMood;
  tempoBpm: number;
  genre: string;
  durationSeconds: number;
  energyLevel: number;
}

export class MusicPlan {
  readonly mood: MusicMood;
  readonly tempoBpm: number;
  readonly genre: string;
  readonly durationSeconds: number;
  readonly energyLevel: number;

  private constructor(props: MusicPlanProps) {
    this.mood = props.mood;
    this.tempoBpm = props.tempoBpm;
    this.genre = props.genre;
    this.durationSeconds = props.durationSeconds;
    this.energyLevel = Math.max(0, Math.min(100, props.energyLevel));
  }

  static create(props: MusicPlanProps): MusicPlan {
    if (props.tempoBpm <= 0) {
      throw new AppError('Music tempo must be positive', 'VALIDATION_ERROR');
    }
    if (props.durationSeconds <= 0) {
      throw new AppError('Music duration must be positive', 'VALIDATION_ERROR');
    }
    return new MusicPlan(props);
  }

  isHighEnergy(): boolean {
    return this.energyLevel >= 70;
  }
}
