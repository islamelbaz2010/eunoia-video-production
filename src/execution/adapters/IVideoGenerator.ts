export interface VideoGenerationInput {
  imageUrl: string;
  durationSeconds: number;
  motionStyle: string;
  metadata: Record<string, unknown>;
}

export interface VideoGenerationOutput {
  url: string;
  durationSeconds: number;
  format: string;
  metadata: Record<string, unknown>;
}

export interface IVideoGenerator {
  generate(input: VideoGenerationInput): Promise<VideoGenerationOutput>;
}
