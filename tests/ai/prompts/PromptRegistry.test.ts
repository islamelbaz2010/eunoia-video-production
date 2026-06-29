import { PromptRegistry } from '../../../src/ai/prompts/PromptRegistry';
import { createPromptTemplate } from '../../../src/ai/prompts/PromptTemplate';
import { AppError } from '../../../src/shared/errors/AppError';
import { TaskType } from '../../../src/ai/domain/types/TaskType';

function tmpl(name: string, version: number) {
  return createPromptTemplate(name, version, `Template ${name} v${version}`, TaskType.Chat, 'desc');
}

describe('PromptRegistry', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  describe('register / get', () => {
    it('registers and retrieves a template', () => {
      registry.register(tmpl('greet', 1));
      const t = registry.get('greet', 1);
      expect(t.name).toBe('greet');
      expect(t.version).toBe(1);
    });

    it('get without version returns latest version', () => {
      registry.register(tmpl('greet', 1));
      registry.register(tmpl('greet', 2));
      const t = registry.get('greet');
      expect(t.version).toBe(2);
    });

    it('throws PROMPT_NOT_FOUND for unknown name', () => {
      expect(() => registry.get('unknown')).toThrow(AppError);
    });

    it('throws PROMPT_NOT_FOUND for unknown version', () => {
      registry.register(tmpl('greet', 1));
      try {
        registry.get('greet', 99);
        fail('should throw');
      } catch (e) {
        expect((e as AppError).code).toBe('PROMPT_NOT_FOUND');
      }
    });
  });

  describe('has', () => {
    it('returns true for registered template', () => {
      registry.register(tmpl('greet', 1));
      expect(registry.has('greet')).toBe(true);
      expect(registry.has('greet', 1)).toBe(true);
    });

    it('returns false for unregistered name', () => {
      expect(registry.has('missing')).toBe(false);
    });

    it('returns false for unregistered version', () => {
      registry.register(tmpl('greet', 1));
      expect(registry.has('greet', 2)).toBe(false);
    });
  });

  describe('unregister', () => {
    it('removes a specific version', () => {
      registry.register(tmpl('greet', 1));
      registry.register(tmpl('greet', 2));
      registry.unregister('greet', 1);
      expect(registry.has('greet', 1)).toBe(false);
      expect(registry.has('greet', 2)).toBe(true);
    });

    it('removes all versions when no version specified', () => {
      registry.register(tmpl('greet', 1));
      registry.register(tmpl('greet', 2));
      registry.unregister('greet');
      expect(registry.has('greet')).toBe(false);
    });
  });

  describe('listNames / listVersions', () => {
    it('lists all registered names', () => {
      registry.register(tmpl('a', 1));
      registry.register(tmpl('b', 1));
      expect(registry.listNames().sort()).toEqual(['a', 'b']);
    });

    it('lists versions sorted ascending', () => {
      registry.register(tmpl('greet', 3));
      registry.register(tmpl('greet', 1));
      registry.register(tmpl('greet', 2));
      expect(registry.listVersions('greet')).toEqual([1, 2, 3]);
    });

    it('returns empty array for unknown name in listVersions', () => {
      expect(registry.listVersions('none')).toEqual([]);
    });
  });
});
