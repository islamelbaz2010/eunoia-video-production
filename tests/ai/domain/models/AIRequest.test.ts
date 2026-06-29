import { createAIRequest } from '../../../../src/ai/domain/models/AIRequest';
import { TaskType } from '../../../../src/ai/domain/types/TaskType';

describe('createAIRequest', () => {
  it('generates a unique id', () => {
    const a = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
    const b = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
    expect(a.id).not.toBe(b.id);
  });

  it('sets required fields', () => {
    const req = createAIRequest({ taskType: TaskType.Summarization, prompt: 'Summarize this' });
    expect(req.taskType).toBe(TaskType.Summarization);
    expect(req.prompt).toBe('Summarize this');
    expect(req.createdAt).toBeInstanceOf(Date);
  });

  it('defaults nullable fields to null', () => {
    const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
    expect(req.systemPrompt).toBeNull();
    expect(req.context).toBeNull();
    expect(req.maxTokens).toBeNull();
    expect(req.temperature).toBeNull();
  });

  it('accepts optional fields', () => {
    const req = createAIRequest({
      taskType: TaskType.Chat,
      prompt: 'Hi',
      systemPrompt: 'Be helpful',
      context: 'Some context',
      maxTokens: 256,
      temperature: 0.7,
      metadata: { source: 'test' },
    });

    expect(req.systemPrompt).toBe('Be helpful');
    expect(req.context).toBe('Some context');
    expect(req.maxTokens).toBe(256);
    expect(req.temperature).toBe(0.7);
    expect(req.metadata['source']).toBe('test');
  });

  it('freezes metadata', () => {
    const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi', metadata: { x: 1 } });
    expect(Object.isFrozen(req.metadata)).toBe(true);
  });

  it('defaults metadata to empty frozen object', () => {
    const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
    expect(req.metadata).toEqual({});
    expect(Object.isFrozen(req.metadata)).toBe(true);
  });
});
