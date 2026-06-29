import { AgentMemory } from '../../../src/ai/memory/AgentMemory';
import { InMemoryMemoryStore } from '../../../src/ai/memory/InMemoryMemoryStore';

function makeAgent(agentName = 'TestAgent') {
  return new AgentMemory(
    { agentName, taskDescription: 'Do test things', metadata: {} },
    new InMemoryMemoryStore(),
    'agent-session-1',
  );
}

describe('AgentMemory', () => {
  it('stores and retrieves agent context', () => {
    const agent = makeAgent('Scorer');
    expect(agent.getAgentContext().agentName).toBe('Scorer');
    expect(agent.getAgentContext().taskDescription).toBe('Do test things');
  });

  it('addUserMessage appends a user entry', () => {
    const agent = makeAgent();
    agent.addUserMessage('What is this?');
    expect(agent.getHistory()[0]!.role).toBe('user');
  });

  it('addAssistantMessage appends an assistant entry', () => {
    const agent = makeAgent();
    agent.addAssistantMessage('It is a test.');
    expect(agent.getHistory()[0]!.role).toBe('assistant');
  });

  it('addSystemMessage appends a system entry', () => {
    const agent = makeAgent();
    agent.addSystemMessage('Context here.');
    expect(agent.getHistory()[0]!.role).toBe('system');
  });

  it('storeFact and recallFact', () => {
    const agent = makeAgent();
    agent.storeFact('topic', 'TypeScript');
    expect(agent.recallFact('topic')).toBe('TypeScript');
  });

  it('recallFact returns null for unknown key', () => {
    const agent = makeAgent();
    expect(agent.recallFact('missing')).toBeNull();
  });

  it('getFacts returns all stored facts', () => {
    const agent = makeAgent();
    agent.storeFact('a', '1');
    agent.storeFact('b', '2');
    expect(agent.getFacts().size).toBe(2);
  });

  it('clear removes history and facts', () => {
    const agent = makeAgent();
    agent.addUserMessage('Hi');
    agent.storeFact('x', 'y');
    agent.clear();
    expect(agent.getHistory()).toHaveLength(0);
    expect(agent.getFacts().size).toBe(0);
  });

  it('buildSystemPrompt includes agent name, task, and facts', () => {
    const agent = makeAgent('Scorer');
    agent.storeFact('topic', 'AI');
    const prompt = agent.buildSystemPrompt();
    expect(prompt).toContain('Scorer');
    expect(prompt).toContain('Do test things');
    expect(prompt).toContain('topic: AI');
  });

  it('buildSystemPrompt omits facts section when empty', () => {
    const agent = makeAgent();
    const prompt = agent.buildSystemPrompt();
    expect(prompt).not.toContain('Known facts:');
  });
});
