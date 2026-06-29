import { ProviderRegistry } from '../../../../src/discovery/infrastructure/registry/ProviderRegistry';
import { DuplicateError } from '../../../../src/shared/errors/AppError';
import { DiscoverySource, type IDiscoveryProvider } from '../../../../src/discovery/domain/providers/IDiscoveryProvider';

function makeProvider(name: string, configured = true): IDiscoveryProvider {
  return {
    name,
    source: DiscoverySource.RSS,
    isConfigured: () => configured,
    fetchOpportunities: jest.fn().mockResolvedValue([]),
  };
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register', () => {
    it('registers a provider successfully', () => {
      const provider = makeProvider('rss');
      registry.register(provider);
      expect(registry.get('rss')).toBe(provider);
    });

    it('throws DuplicateError when registering the same name twice', () => {
      registry.register(makeProvider('rss'));
      expect(() => registry.register(makeProvider('rss'))).toThrow(DuplicateError);
    });

    it('allows registering multiple providers with different names', () => {
      registry.register(makeProvider('rss'));
      registry.register(makeProvider('youtube'));
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('removes a registered provider', () => {
      registry.register(makeProvider('rss'));
      registry.unregister('rss');
      expect(registry.get('rss')).toBeUndefined();
    });

    it('is idempotent for non-existent names', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('returns undefined for an unknown provider', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all registered providers regardless of configured state', () => {
      registry.register(makeProvider('rss', true));
      registry.register(makeProvider('youtube', false));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns an empty array when no providers are registered', () => {
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getConfigured', () => {
    it('returns only providers where isConfigured() is true', () => {
      registry.register(makeProvider('rss', true));
      registry.register(makeProvider('youtube', false));
      registry.register(makeProvider('reddit', true));

      const configured = registry.getConfigured();
      expect(configured).toHaveLength(2);
      expect(configured.map(p => p.name)).toEqual(expect.arrayContaining(['rss', 'reddit']));
    });

    it('returns an empty array when no providers are configured', () => {
      registry.register(makeProvider('youtube', false));
      expect(registry.getConfigured()).toHaveLength(0);
    });
  });
});
