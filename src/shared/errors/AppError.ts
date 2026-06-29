export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'APP_ERROR',
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    public readonly providerName: string,
  ) {
    super(message, 'PROVIDER_ERROR');
  }
}

export class RepositoryError extends AppError {
  constructor(message: string) {
    super(message, 'REPOSITORY_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND');
  }
}

export class DuplicateError extends AppError {
  constructor(message: string) {
    super(message, 'DUPLICATE_ERROR');
  }
}
