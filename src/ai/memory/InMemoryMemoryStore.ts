import { randomUUID } from 'crypto';
import type { IMemoryStore, MemoryEntry, MessageRole } from './IMemoryStore';

export class InMemoryMemoryStore implements IMemoryStore {
  private readonly sessions = new Map<string, MemoryEntry[]>();
  private readonly entryIndex = new Map<string, string>();

  append(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>,
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      createdAt: new Date(),
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    };

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.sessions.get(sessionId)!.push(entry);
    this.entryIndex.set(entry.id, sessionId);

    return entry;
  }

  getHistory(sessionId: string, limit?: number): MemoryEntry[] {
    const entries = this.sessions.get(sessionId) ?? [];
    if (limit !== undefined && limit > 0) {
      return entries.slice(-limit);
    }
    return [...entries];
  }

  clear(sessionId: string): void {
    const entries = this.sessions.get(sessionId) ?? [];
    for (const entry of entries) {
      this.entryIndex.delete(entry.id);
    }
    this.sessions.delete(sessionId);
  }

  delete(entryId: string): void {
    const sessionId = this.entryIndex.get(entryId);
    if (sessionId === undefined) return;

    const entries = this.sessions.get(sessionId);
    if (entries === undefined) return;

    const filtered = entries.filter(e => e.id !== entryId);
    this.sessions.set(sessionId, filtered);
    this.entryIndex.delete(entryId);
  }

  getSessions(): string[] {
    return [...this.sessions.keys()];
  }
}
