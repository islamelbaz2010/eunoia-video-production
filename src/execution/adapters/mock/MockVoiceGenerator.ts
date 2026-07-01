import type { IVoiceGenerator, VoiceGenerationInput, VoiceGenerationOutput } from '../IVoiceGenerator';

export class MockVoiceGenerator implements IVoiceGenerator {
  async generate(input: VoiceGenerationInput): Promise<VoiceGenerationOutput> {
    const words = input.text.split(' ').length;
    const durationSeconds = Math.ceil(words / 2.5);
    return {
      url: `mock://audio/${Date.now()}.mp3`,
      durationSeconds,
      format: 'mp3',
      metadata: { mock: true, voiceStyle: input.voiceStyle, language: input.language },
    };
  }
}
