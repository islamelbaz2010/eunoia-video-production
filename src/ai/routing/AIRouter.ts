import type { IAIProvider } from '../application/IAIProvider';
import type { AIRequest } from '../domain/models/AIRequest';
import { AIRoutingError } from '../domain/errors/AIError';
import type { ProviderType } from '../domain/types/ProviderType';
import type { ILogger } from '../../shared/logger/ILogger';
import { type RoutingPolicy, DEFAULT_ROUTING_POLICY } from './RoutingPolicy';
import { RoutingStrategy } from './RoutingStrategy';

const QUALITY_SCORES: Record<string, number> = {
  claude: 1.0,
  openai: 0.9,
  gemini: 0.8,
};

export class AIRouter {
  private readonly providers = new Map<ProviderType, IAIProvider>();

  constructor(private readonly logger: ILogger) {}

  register(provider: IAIProvider): void {
    this.providers.set(provider.type, provider);
    this.logger.debug({ provider: provider.type }, 'AI provider registered');
  }

  unregister(providerType: ProviderType): void {
    this.providers.delete(providerType);
  }

  select(request: AIRequest, policy: RoutingPolicy = DEFAULT_ROUTING_POLICY): IAIProvider {
    const candidates = this.filterCandidates(request, policy);

    if (candidates.length === 0) {
      throw new AIRoutingError(
        `No available AI provider supports task type '${request.taskType}'`,
      );
    }

    return this.applyStrategy(candidates, request, policy);
  }

  getProviders(): ReadonlyArray<IAIProvider> {
    return [...this.providers.values()];
  }

  private filterCandidates(request: AIRequest, policy: RoutingPolicy): IAIProvider[] {
    const excluded = new Set<string>(policy.excludeProviders ?? []);

    return [...this.providers.values()].filter(p => {
      if (excluded.has(p.type)) return false;
      if (!p.isAvailable()) return false;
      if (!p.supports(request.taskType)) return false;
      return true;
    });
  }

  private applyStrategy(
    candidates: IAIProvider[],
    request: AIRequest,
    policy: RoutingPolicy,
  ): IAIProvider {
    switch (policy.strategy) {
      case RoutingStrategy.LowestCost:
        return this.selectLowestCost(candidates, request);

      case RoutingStrategy.HighestQuality:
        return this.selectHighestQuality(candidates);

      case RoutingStrategy.Fastest:
        return this.selectFastest(candidates, request);

      case RoutingStrategy.Manual:
        return this.selectManual(candidates, policy.preferredProvider);

      case RoutingStrategy.Balanced:
        return this.selectBalanced(candidates, request);
    }
  }

  private selectLowestCost(candidates: IAIProvider[], request: AIRequest): IAIProvider {
    return candidates.reduce((best, p) => {
      const cost = p.estimateCost(request).estimatedTotal;
      const bestCost = best.estimateCost(request).estimatedTotal;
      return cost < bestCost ? p : best;
    });
  }

  private selectHighestQuality(candidates: IAIProvider[]): IAIProvider {
    return candidates.reduce((best, p) => {
      const score = QUALITY_SCORES[p.type] ?? 0;
      const bestScore = QUALITY_SCORES[best.type] ?? 0;
      return score > bestScore ? p : best;
    });
  }

  private selectFastest(candidates: IAIProvider[], request: AIRequest): IAIProvider {
    return candidates.reduce((best, p) => {
      return p.estimateLatency(request) < best.estimateLatency(request) ? p : best;
    });
  }

  private selectManual(candidates: IAIProvider[], preferred: ProviderType | undefined): IAIProvider {
    if (preferred !== undefined) {
      const found = candidates.find(p => p.type === preferred);
      if (found !== undefined) return found;
    }
    const first = candidates[0];
    if (first === undefined) {
      throw new AIRoutingError('No candidates available for manual provider selection');
    }
    return first;
  }

  private selectBalanced(candidates: IAIProvider[], request: AIRequest): IAIProvider {
    const costs = candidates.map(p => p.estimateCost(request).estimatedTotal);
    const latencies = candidates.map(p => p.estimateLatency(request));
    const maxCost = Math.max(...costs, 1);
    const maxLatency = Math.max(...latencies, 1);

    let bestScore = -Infinity;
    let best = candidates[0]!;

    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i]!;
      const costScore = 1 - (costs[i] ?? 0) / maxCost;
      const qualityScore = QUALITY_SCORES[p.type] ?? 0;
      const latencyScore = 1 - (latencies[i] ?? 0) / maxLatency;
      const score = 0.4 * costScore + 0.3 * qualityScore + 0.3 * latencyScore;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }
}
