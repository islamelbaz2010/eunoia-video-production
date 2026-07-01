export interface VideoAssemblyInput {
  videoUrl: string;
  voiceUrl: string;
  musicUrl: string | null;
  platform: string;
  targetDurationSeconds: number;
  metadata: Record<string, unknown>;
}

export interface VideoAssemblyOutput {
  url: string;
  durationSeconds: number;
  format: string;
  platform: string;
  metadata: Record<string, unknown>;
}

export interface IVideoAssembler {
  assemble(input: VideoAssemblyInput): Promise<VideoAssemblyOutput>;
}
