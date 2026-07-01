export interface MusicGenerationInput {
  mood: string;
  genre: string;
  tempoBpm: number;
  durationSeconds: number;
  energyLevel: number;
  metadata: Record<string, unknown>;
}

export interface MusicGenerationOutput {
  url: string;
  durationSeconds: number;
  format: string;
  metadata: Record<string, unknown>;
}

export interface IMusicGenerator {
  generate(input: MusicGenerationInput): Promise<MusicGenerationOutput>;
}
