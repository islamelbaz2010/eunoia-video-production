export interface UploadInput {
  sourceUrl: string;
  destinationPath: string;
  contentType: string;
  metadata: Record<string, unknown>;
}

export interface UploadOutput {
  url: string;
  destinationPath: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
}

export interface IUploader {
  upload(input: UploadInput): Promise<UploadOutput>;
}
