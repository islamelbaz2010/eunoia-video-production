import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import { VoiceStyle } from '../../../src/creative/domain/types';

function makeScene(index: number) {
  return {
    index,
    title: `Scene ${index}`,
    description: `Description ${index}`,
    durationSeconds: 60,
    visualCue: 'close-up shot',
    voiceoverText: 'Welcome to this tutorial',
  };
}

function make(overrides = {}) {
  return ScriptPlan.create({
    scenes: [makeScene(0), makeScene(1), makeScene(2)],
    totalDurationSeconds: 180,
    language: 'en',
    voiceoverStyle: VoiceStyle.Professional,
    ...overrides,
  });
}

describe('ScriptPlan', () => {
  it('creates with valid props', () => {
    const s = make();
    expect(s.sceneCount()).toBe(3);
    expect(s.totalDurationSeconds).toBe(180);
  });

  it('sceneCount() returns number of scenes', () => {
    expect(make({ scenes: [makeScene(0)] }).sceneCount()).toBe(1);
    expect(make({ scenes: [] }).sceneCount()).toBe(0);
  });

  it('totalDurationMinutes() converts seconds to minutes', () => {
    expect(make({ totalDurationSeconds: 300 }).totalDurationMinutes()).toBe(5);
    expect(make({ totalDurationSeconds: 90 }).totalDurationMinutes()).toBe(1.5);
  });

  it('scenes are frozen', () => {
    const s = make();
    expect(Object.isFrozen(s.scenes)).toBe(true);
  });
});
