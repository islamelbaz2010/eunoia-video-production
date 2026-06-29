import { InMemoryMemoryStore } from '../../../src/ai/memory/InMemoryMemoryStore';

describe('InMemoryMemoryStore', () => {
  let store: InMemoryMemoryStore;

  beforeEach(() => {
    store = new InMemoryMemoryStore();
  });

  describe('append', () => {
    it('returns a MemoryEntry with an id', () => {
      const entry = store.append('s1', 'user', 'Hello');
      expect(entry.id).toBeDefined();
      expect(entry.sessionId).toBe('s1');
      expect(entry.role).toBe('user');
      expect(entry.content).toBe('Hello');
    });

    it('freezes metadata', () => {
      const entry = store.append('s1', 'user', 'Hi', { k: 'v' });
      expect(Object.isFrozen(entry.metadata)).toBe(true);
    });

    it('defaults metadata to empty frozen object', () => {
      const entry = store.append('s1', 'assistant', 'Reply');
      expect(entry.metadata).toEqual({});
    });
  });

  describe('getHistory', () => {
    it('returns all entries for a session', () => {
      store.append('s1', 'user', 'A');
      store.append('s1', 'assistant', 'B');
      expect(store.getHistory('s1')).toHaveLength(2);
    });

    it('returns empty array for unknown session', () => {
      expect(store.getHistory('unknown')).toEqual([]);
    });

    it('respects limit by returning last N entries', () => {
      for (let i = 0; i < 5; i++) store.append('s1', 'user', `msg${i}`);
      const history = store.getHistory('s1', 3);
      expect(history).toHaveLength(3);
      expect(history[0]!.content).toBe('msg2');
    });

    it('does not mix sessions', () => {
      store.append('s1', 'user', 'A');
      store.append('s2', 'user', 'B');
      expect(store.getHistory('s1')).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all entries for a session', () => {
      store.append('s1', 'user', 'A');
      store.clear('s1');
      expect(store.getHistory('s1')).toHaveLength(0);
    });

    it('does not affect other sessions', () => {
      store.append('s1', 'user', 'A');
      store.append('s2', 'user', 'B');
      store.clear('s1');
      expect(store.getHistory('s2')).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('removes a single entry by id', () => {
      const entry = store.append('s1', 'user', 'A');
      store.append('s1', 'user', 'B');
      store.delete(entry.id);
      expect(store.getHistory('s1')).toHaveLength(1);
    });

    it('does nothing for unknown entry id', () => {
      expect(() => store.delete('unknown')).not.toThrow();
    });
  });

  describe('getSessions', () => {
    it('returns all session ids', () => {
      store.append('s1', 'user', 'A');
      store.append('s2', 'user', 'B');
      expect(store.getSessions().sort()).toEqual(['s1', 's2']);
    });

    it('returns empty array when no sessions', () => {
      expect(store.getSessions()).toEqual([]);
    });
  });
});
