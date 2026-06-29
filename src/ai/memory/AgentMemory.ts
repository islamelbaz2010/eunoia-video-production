import type { IMemoryStore, MemoryEntry } from './IMemoryStore';
import { ConversationMemory } from './ConversationMemory';

export interface AgentContext {
  readonly agentName: string;
  readonly taskDescription: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export class AgentMemory {
  private readonly conversation: ConversationMemory;
  private readonly facts: Map<string, string> = new Map();

  constructor(
    private readonly agentContext: AgentContext,
    store: IMemoryStore,
    sessionId: string,
    maxHistory?: number,
  ) {
    this.conversation = new ConversationMemory(sessionId, store, maxHistory);
  }

  getAgentContext(): AgentContext {
    return this.agentContext;
  }

  addUserMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.conversation.addUserMessage(content, metadata);
  }

  addAssistantMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.conversation.addAssistantMessage(content, metadata);
  }

  addSystemMessage(content: string, metadata?: Record<string, unknown>): MemoryEntry {
    return this.conversation.addSystemMessage(content, metadata);
  }

  getHistory(limit?: number): MemoryEntry[] {
    return this.conversation.getHistory(limit);
  }

  storeFact(key: string, value: string): void {
    this.facts.set(key, value);
  }

  recallFact(key: string): string | null {
    return this.facts.get(key) ?? null;
  }

  getFacts(): ReadonlyMap<string, string> {
    return this.facts;
  }

  clear(): void {
    this.conversation.clear();
    this.facts.clear();
  }

  buildSystemPrompt(): string {
    const lines: string[] = [
      `Agent: ${this.agentContext.agentName}`,
      `Task: ${this.agentContext.taskDescription}`,
    ];

    if (this.facts.size > 0) {
      lines.push('Known facts:');
      for (const [k, v] of this.facts) {
        lines.push(`  ${k}: ${v}`);
      }
    }

    return lines.join('\n');
  }
}
