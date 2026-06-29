import type { IMemoryStore, MemoryEntry } from './IMemoryStore';

export class ConversationMemory {
  constructor(
    private readonly sessionId: string,
    private readonly store: IMemoryStore,
    private readonly maxHistory: number = 50,
  ) {}

  addUserMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.store.append(this.sessionId, 'user', content, metadata);
  }

  addAssistantMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.store.append(this.sessionId, 'assistant', content, metadata);
  }

  addSystemMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.store.append(this.sessionId, 'system', content, metadata);
  }

  getHistory(limit?: number): MemoryEntry[] {
    return this.store.getHistory(this.sessionId, limit ?? this.maxHistory);
  }

  clear(): void {
    this.store.clear(this.sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  buildContextString(): string {
    return this.getHistory()
      .map(e => `${e.role}: ${e.content}`)
      .join('\n');
  }
}
