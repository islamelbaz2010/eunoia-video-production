import type { IMediaValidator, ValidationResult } from '../IMediaValidator';

const ACCEPTED_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm']);
const MAX_FILE_SIZE_BYTES = 128 * 1024 * 1024 * 1024; // 128 GB

export class MockMediaValidator implements IMediaValidator {
  async validate(
    filename: string,
    fileSizeBytes: number,
    _mimeType: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      errors.push(
        `Unsupported file format '${ext}'. Accepted formats: MP4, MOV, MKV, WebM.`,
      );
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      errors.push(`File size ${fileSizeBytes} bytes exceeds the maximum allowed size of 128 GB.`);
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings: [],
      detectedCodec: valid ? 'h264' : null,
      detectedMimeType: valid ? _mimeType : null,
    };
  }
}
