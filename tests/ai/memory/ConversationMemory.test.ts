import { ConversationMemory } from '../../../src/ai/memory/ConversationMemory';
import { InMemoryMemoryStore } from '../../../src/ai/memory/InMemoryMemoryStore';

function makeConversation(sessionId = 'sess-1', maxHistory = 50) {
  return new ConversationMemory(sessionId, new InMemoryMemoryStore(), maxHistory);
}

describe('ConversationMemory', () => {
  it('addUserMessage stores a user entry', () => {
    const conv = makeConversation();
    conv.addUserMessage('Hello');
    expect(conv.getHistory()[0]!.role).toBe('user');
  });

  it('addAssistantMessage stores an assistant entry', () => {
    const conv = makeConversation();
    conv.addAssistantMessage('Hi there');
    expect(conv.getHistory()[0]!.role).toBe('assistant');
  });

  it('addSystemMessage stores a system entry', () => {
    const conv = makeConversation();
    conv.addSystemMessage('You are helpful');
    expect(conv.getHistory()[0]!.role).toBe('system');
  });

  it('getSessionId returns the session id', () => {
    const conv = makeConversation('my-session');
    expect(conv.getSessionId()).toBe('my-session');
  });

  it('clear removes all messages', () => {
    const conv = makeConversation();
    conv.addUserMessage('Hello');
    conv.clear();
    expect(conv.getHistory()).toHaveLength(0);
  });

  it('getHistory respects limit', () => {
    const conv = makeConversation('s', 5);
    for (let i = 0; i < 10; i++) conv.addUserMessage(`msg${i}`);
    expect(conv.getHistory()).toHaveLength(5);
  });

  it('buildContextString returns formatted history', () => {
    const conv = makeConversation();
    conv.addSystemMessage('System context');
    conv.addUserMessage('User question');
    conv.addAssistantMessage('AI answer');
    const ctx = conv.buildContextString();
    expect(ctx).toContain('system: System context');
    expect(ctx).toContain('user: User question');
    expect(ctx).toContain('assistant: AI answer');
  });
});
