import type { IUploader, UploadInput, UploadOutput } from '../IUploader';

export class MockUploader implements IUploader {
  async upload(input: UploadInput): Promise<UploadOutput> {
    return {
      url: `mock://storage/${input.destinationPath}`,
      destinationPath: input.destinationPath,
      sizeBytes: 1024 * 1024,
      metadata: { mock: true, contentType: input.contentType },
    };
  }
}
