import { PromptPackage, makeLLMPrompt, makeImagePrompt, makeVideoPrompt, makeVoicePrompt, makeMusicPrompt } from '../../../src/creative/domain/models/PromptPackage';
import { TaskType } from '../../../src/ai/domain/types/TaskType';
import { VoiceStyle, MusicMood } from '../../../src/creative/domain/types';

function makePackage(overrides = {}) {
  return PromptPackage.create({
    planId: 'plan-1',
    llmPrompts: [makeLLMPrompt({ taskType: TaskType.Script, systemPrompt: 'sys', userPrompt: 'usr' })],
    imagePrompts: [makeImagePrompt({ description: 'thumbnail', style: 'modern' })],
    videoPrompts: [makeVideoPrompt({ description: 'scene 1', sceneIndex: 0, durationSeconds: 30 })],
    voicePrompts: [makeVoicePrompt({ text: 'Hello', voiceStyle: VoiceStyle.Professional, language: 'en' })],
    musicPrompts: [makeMusicPrompt({ mood: MusicMood.Calm, genre: 'ambient', durationSeconds: 60 })],
    ...overrides,
  });
}

describe('PromptPackage', () => {
  it('create() sets generatedAt', () => {
    const before = new Date();
    const pkg = makePackage();
    expect(pkg.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('reconstitute() preserves generatedAt', () => {
    const ts = new Date('2026-01-01');
    const pkg = PromptPackage.reconstitute({
      planId: 'p1',
      llmPrompts: [],
      imagePrompts: [],
      videoPrompts: [],
      voicePrompts: [],
      musicPrompts: [],
      generatedAt: ts,
    });
    expect(pkg.generatedAt.toISOString()).toContain('2026-01-01');
  });

  it('totalPromptCount() sums all prompt arrays', () => {
    const pkg = makePackage();
    expect(pkg.totalPromptCount()).toBe(5);
  });

  it('all arrays are frozen', () => {
    const pkg = makePackage();
    expect(Object.isFrozen(pkg.llmPrompts)).toBe(true);
    expect(Object.isFrozen(pkg.imagePrompts)).toBe(true);
    expect(Object.isFrozen(pkg.videoPrompts)).toBe(true);
    expect(Object.isFrozen(pkg.voicePrompts)).toBe(true);
    expect(Object.isFrozen(pkg.musicPrompts)).toBe(true);
  });
});

describe('Prompt factory helpers', () => {
  it('makeLLMPrompt defaults optional fields to null', () => {
    const p = makeLLMPrompt({ taskType: TaskType.Script, systemPrompt: 'sys', userPrompt: 'usr' });
    expect(p.context).toBeNull();
    expect(p.maxTokens).toBeNull();
    expect(p.preferredProvider).toBeNull();
    expect(p.id).toBeTruthy();
  });

  it('makeImagePrompt defaults aspectRatio to 16:9', () => {
    const p = makeImagePrompt({ description: 'test', style: 'cinematic' });
    expect(p.aspectRatio).toBe('16:9');
    expect(p.negativePrompt).toBeNull();
  });

  it('makeVideoPrompt defaults style to cinematic', () => {
    const p = makeVideoPrompt({ description: 'scene', sceneIndex: 0, durationSeconds: 10 });
    expect(p.style).toBe('cinematic');
    expect(p.transitions).toBeNull();
  });

  it('makeVoicePrompt defaults emphasis to empty array', () => {
    const p = makeVoicePrompt({ text: 'hello', voiceStyle: VoiceStyle.Calm, language: 'en' });
    expect(p.emphasis).toHaveLength(0);
  });

  it('makeMusicPrompt defaults tempoBpm to 120', () => {
    const p = makeMusicPrompt({ mood: MusicMood.Upbeat, genre: 'pop', durationSeconds: 30 });
    expect(p.tempoBpm).toBe(120);
    expect(p.energyLevel).toBe(60);
  });
});
