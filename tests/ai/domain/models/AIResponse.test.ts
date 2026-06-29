import { createAIResponse } from '../../../../src/ai/domain/models/AIResponse';
import { createAIUsage } from '../../../../src/ai/domain/models/AIUsage';
import { ProviderType } from '../../../../src/ai/domain/types/ProviderType';

function makeUsage() {
  return createAIUsage(100, 50, 0.000005, 0.000015);
}

describe('createAIResponse', () => {
  it('generates a unique id', () => {
    const usage = makeUsage();
    const a = createAIResponse({ requestId: 'r1', provider: ProviderType.OpenAI, content: 'Hi', usage, latencyMs: 100, finishReason: 'stop' });
    const b = createAIResponse({ requestId: 'r1', provider: ProviderType.OpenAI, content: 'Hi', usage, latencyMs: 100, finishReason: 'stop' });
    expect(a.id).not.toBe(b.id);
  });

  it('sets all required fields', () => {
    const usage = makeUsage();
    const res = createAIResponse({
      requestId: 'req-1',
      provider: ProviderType.OpenAI,
      content: 'Response text',
      usage,
      latencyMs: 500,
      finishReason: 'stop',
    });

    expect(res.requestId).toBe('req-1');
    expect(res.provider).toBe(ProviderType.OpenAI);
    expect(res.content).toBe('Response text');
    expect(res.latencyMs).toBe(500);
    expect(res.finishReason).toBe('stop');
    expect(res.createdAt).toBeInstanceOf(Date);
  });

  it('defaults metadata to frozen empty object', () => {
    const res = createAIResponse({ requestId: 'r', provider: ProviderType.Claude, content: '', usage: makeUsage(), latencyMs: 0, finishReason: 'stop' });
    expect(res.metadata).toEqual({});
    expect(Object.isFrozen(res.metadata)).toBe(true);
  });

  it('accepts metadata', () => {
    const res = createAIResponse({ requestId: 'r', provider: ProviderType.OpenAI, content: '', usage: makeUsage(), latencyMs: 0, finishReason: 'stop', metadata: { model: 'gpt-4o' } });
    expect(res.metadata['model']).toBe('gpt-4o');
  });
});

describe('createAIUsage', () => {
  it('computes totalTokens', () => {
    const u = createAIUsage(100, 50, 0.000005, 0.000015);
    expect(u.totalTokens).toBe(150);
  });

  it('computes estimatedCostUsd', () => {
    const u = createAIUsage(1000, 500, 0.000005, 0.000015);
    expect(u.estimatedCostUsd).toBeCloseTo(0.0125);
  });

  it('sets inputTokens and outputTokens', () => {
    const u = createAIUsage(200, 80, 0.000001, 0.000002);
    expect(u.inputTokens).toBe(200);
    expect(u.outputTokens).toBe(80);
  });
});
