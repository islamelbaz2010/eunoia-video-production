import type { IVideoAssembler, VideoAssemblyInput, VideoAssemblyOutput } from '../IVideoAssembler';

export class MockVideoAssembler implements IVideoAssembler {
  async assemble(input: VideoAssemblyInput): Promise<VideoAssemblyOutput> {
    return {
      url: `mock://assembled/${Date.now()}.mp4`,
      durationSeconds: input.targetDurationSeconds,
      format: 'mp4',
      platform: input.platform,
      metadata: { mock: true, videoUrl: input.videoUrl, voiceUrl: input.voiceUrl },
    };
  }
}
