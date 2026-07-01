export interface ImageGenerationInput {
  prompt: string;
  style: string;
  dimensions: { width: number; height: number };
  metadata: Record<string, unknown>;
}

export interface ImageGenerationOutput {
  url: string;
  width: number;
  height: number;
  format: string;
  metadata: Record<string, unknown>;
}

export interface IImageGenerator {
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}
