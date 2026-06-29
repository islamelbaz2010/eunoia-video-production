import type { ProviderType } from '../domain/types/ProviderType';
import { RoutingStrategy } from './RoutingStrategy';

export interface RoutingPolicy {
  readonly strategy: RoutingStrategy;
  readonly preferredProvider?: ProviderType;
  readonly maxCostPerRequestUsd?: number;
  readonly maxLatencyMs?: number;
  readonly excludeProviders?: ReadonlyArray<ProviderType>;
}

export const DEFAULT_ROUTING_POLICY: RoutingPolicy = {
  strategy: RoutingStrategy.Balanced,
};
