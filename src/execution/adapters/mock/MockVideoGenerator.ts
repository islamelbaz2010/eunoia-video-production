import type { IVideoGenerator, VideoGenerationInput, VideoGenerationOutput } from '../IVideoGenerator';

export class MockVideoGenerator implements IVideoGenerator {
  async generate(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    return {
      url: `mock://videos/${Date.now()}.mp4`,
      durationSeconds: input.durationSeconds,
      format: 'mp4',
      metadata: { mock: true, imageUrl: input.imageUrl, motionStyle: input.motionStyle },
    };
  }
}
