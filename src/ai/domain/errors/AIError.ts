import { AppError } from '../../../shared/errors/AppError';
import type { ProviderType } from '../types/ProviderType';

export class AIProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: ProviderType,
  ) {
    super(message, 'AI_PROVIDER_ERROR');
  }
}

export class AIProviderUnavailableError extends AppError {
  constructor(public readonly provider: ProviderType) {
    super(`AI provider '${provider}' is unavailable`, 'AI_PROVIDER_UNAVAILABLE');
  }
}

export class AIRoutingError extends AppError {
  constructor(message: string) {
    super(message, 'AI_ROUTING_ERROR');
  }
}

export class AIProviderNotImplementedError extends AppError {
  constructor(public readonly provider: ProviderType) {
    super(`AI provider '${provider}' execute() is not yet implemented`, 'AI_PROVIDER_NOT_IMPLEMENTED');
  }
}
