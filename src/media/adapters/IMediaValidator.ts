import type { QualityWarning } from '../domain/models/QualityWarning';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: QualityWarning[];
  readonly detectedCodec: string | null;
  readonly detectedMimeType: string | null;
}

export interface IMediaValidator {
  validate(filename: string, fileSizeBytes: number, mimeType: string): Promise<ValidationResult>;
}
