export type MessageRole = 'user' | 'assistant' | 'system';

export interface MemoryEntry {
  readonly id: string;
  readonly sessionId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface IMemoryStore {
  append(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>,
  ): MemoryEntry;
  getHistory(sessionId: string, limit?: number): MemoryEntry[];
  clear(sessionId: string): void;
  delete(entryId: string): void;
  getSessions(): string[];
}
