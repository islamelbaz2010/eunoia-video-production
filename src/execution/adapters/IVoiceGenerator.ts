export interface VoiceGenerationInput {
  text: string;
  voiceStyle: string;
  tone: string;
  pacing: string;
  language: string;
  metadata: Record<string, unknown>;
}

export interface VoiceGenerationOutput {
  url: string;
  durationSeconds: number;
  format: string;
  metadata: Record<string, unknown>;
}

export interface IVoiceGenerator {
  generate(input: VoiceGenerationInput): Promise<VoiceGenerationOutput>;
}
