import type { IMusicGenerator, MusicGenerationInput, MusicGenerationOutput } from '../IMusicGenerator';

export class MockMusicGenerator implements IMusicGenerator {
  async generate(input: MusicGenerationInput): Promise<MusicGenerationOutput> {
    return {
      url: `mock://music/${Date.now()}.mp3`,
      durationSeconds: input.durationSeconds,
      format: 'mp3',
      metadata: { mock: true, mood: input.mood, genre: input.genre, tempoBpm: input.tempoBpm },
    };
  }
}
