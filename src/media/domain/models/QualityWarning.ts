export type QualityWarningCode = 'LOW_RESOLUTION' | 'LOW_FRAME_RATE';

export interface QualityWarning {
  readonly code: QualityWarningCode;
  readonly message: string;
}
