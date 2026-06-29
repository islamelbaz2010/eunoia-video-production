import type { IDiscoveryProvider } from '../../domain/providers/IDiscoveryProvider';
import type { IProviderRegistry } from '../../domain/registry/IProviderRegistry';
import { DuplicateError } from '../../../shared/errors/AppError';

export class ProviderRegistry implements IProviderRegistry {
  private readonly providers = new Map<string, IDiscoveryProvider>();

  register(provider: IDiscoveryProvider): void {
    if (this.providers.has(provider.name)) {
      throw new DuplicateError(
        `Provider '${provider.name}' is already registered. Unregister it first.`,
      );
    }
    this.providers.set(provider.name, provider);
  }

  unregister(name: string): void {
    this.providers.delete(name);
  }

  get(name: string): IDiscoveryProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): ReadonlyArray<IDiscoveryProvider> {
    return [...this.providers.values()];
  }

  getConfigured(): ReadonlyArray<IDiscoveryProvider> {
    return [...this.providers.values()].filter(p => p.isConfigured());
  }
}
