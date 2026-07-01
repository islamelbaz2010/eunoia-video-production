import type { IImageGenerator, ImageGenerationInput, ImageGenerationOutput } from '../IImageGenerator';

export class MockImageGenerator implements IImageGenerator {
  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return {
      url: `mock://images/${Date.now()}.png`,
      width: input.dimensions.width,
      height: input.dimensions.height,
      format: 'png',
      metadata: { mock: true, prompt: input.prompt, style: input.style },
    };
  }
}
