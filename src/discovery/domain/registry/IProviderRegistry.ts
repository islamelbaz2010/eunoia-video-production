import type { IDiscoveryProvider } from '../providers/IDiscoveryProvider';

export interface IProviderRegistry {
  register(provider: IDiscoveryProvider): void;
  unregister(name: string): void;
  get(name: string): IDiscoveryProvider | undefined;
  getAll(): ReadonlyArray<IDiscoveryProvider>;
  getConfigured(): ReadonlyArray<IDiscoveryProvider>;
}
