import { VoicePlan } from '../../../src/creative/domain/models/VoicePlan';
import { VoiceStyle } from '../../../src/creative/domain/types';

describe('VoicePlan', () => {
  it('creates with valid props', () => {
    const v = VoicePlan.create({
      voiceStyle: VoiceStyle.Professional,
      tone: 'authoritative',
      pacing: 'medium',
      language: 'en',
      accent: null,
    });
    expect(v.voiceStyle).toBe(VoiceStyle.Professional);
    expect(v.pacing).toBe('medium');
  });

  it('isNeutralAccent() returns true when accent is null', () => {
    const neutral = VoicePlan.create({ voiceStyle: VoiceStyle.Calm, tone: 'calm', pacing: 'slow', language: 'en', accent: null });
    const accented = VoicePlan.create({ voiceStyle: VoiceStyle.Calm, tone: 'calm', pacing: 'slow', language: 'en', accent: 'British' });
    expect(neutral.isNeutralAccent()).toBe(true);
    expect(accented.isNeutralAccent()).toBe(false);
  });

  it.each(['slow', 'medium', 'fast'] as const)('accepts pacing: %s', pacing => {
    expect(() => VoicePlan.create({ voiceStyle: VoiceStyle.Energetic, tone: 'energetic', pacing, language: 'en', accent: null })).not.toThrow();
  });
});
