import type { ProviderStatus } from './ProviderStatus';
import type { ProviderType } from './ProviderType';

export interface ProviderHealth {
  readonly provider: ProviderType;
  readonly status: ProviderStatus;
  readonly latencyMs: number;
  readonly errorRate: number;
  readonly lastCheckedAt: Date;
  readonly message: string | null;
}
