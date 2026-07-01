export interface AssetTransformation {
  readonly type: string;
  readonly appliedAt: Date;
  readonly systemVersion: string;
  readonly modelVersion: string | null;
}
