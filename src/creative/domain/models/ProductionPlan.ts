import type { ScriptPlan } from './ScriptPlan';
import type { ThumbnailPlan } from './ThumbnailPlan';
import type { VoicePlan } from './VoicePlan';
import type { MusicPlan } from './MusicPlan';
import type { PlatformPlan } from './PlatformPlan';

export interface ProductionPlanProps {
  scriptPlan: ScriptPlan;
  thumbnailPlan: ThumbnailPlan;
  voicePlan: VoicePlan;
  musicPlan: MusicPlan;
  platformPlans: PlatformPlan[];
  estimatedProductionDays: number;
  productionOrder: string[];
}

export class ProductionPlan {
  readonly scriptPlan: ScriptPlan;
  readonly thumbnailPlan: ThumbnailPlan;
  readonly voicePlan: VoicePlan;
  readonly musicPlan: MusicPlan;
  readonly platformPlans: ReadonlyArray<PlatformPlan>;
  readonly estimatedProductionDays: number;
  readonly productionOrder: ReadonlyArray<string>;

  private constructor(props: ProductionPlanProps) {
    this.scriptPlan = props.scriptPlan;
    this.thumbnailPlan = props.thumbnailPlan;
    this.voicePlan = props.voicePlan;
    this.musicPlan = props.musicPlan;
    this.platformPlans = Object.freeze([...props.platformPlans]);
    this.estimatedProductionDays = props.estimatedProductionDays;
    this.productionOrder = Object.freeze([...props.productionOrder]);
  }

  static create(props: ProductionPlanProps): ProductionPlan {
    return new ProductionPlan(props);
  }

  primaryPlatformPlan(): PlatformPlan | null {
    return this.platformPlans.find(p => p.isPrimary()) ?? null;
  }

  targetPlatformCount(): number {
    return this.platformPlans.length;
  }
}
