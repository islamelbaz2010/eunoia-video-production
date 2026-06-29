import { loadConfig } from '../../../src/core/config/AppConfig';
import { ConfigurationError } from '../../../src/shared/errors/AppError';

const VALID_ENV = {
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  OPENAI_API_KEY: 'sk-openai',
  GOOGLE_DRIVE_FOLDER: 'folder-id-123',
  N8N_BASE_URL: 'https://n8n.example.com',
};

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  const allKeys = [...Object.keys(VALID_ENV), ...Object.keys(overrides)];

  for (const key of allKeys) {
    saved[key] = process.env[key];
  }

  for (const [key, value] of Object.entries({ ...VALID_ENV, ...overrides })) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('loadConfig', () => {
  it('succeeds with all required env vars set', () => {
    withEnv({}, () => {
      const config = loadConfig();
      expect(config.supabaseUrl).toBe(VALID_ENV.SUPABASE_URL);
      expect(config.supabaseServiceRoleKey).toBe(VALID_ENV.SUPABASE_SERVICE_ROLE_KEY);
      expect(config.openAiApiKey).toBe(VALID_ENV.OPENAI_API_KEY);
      expect(config.googleDriveFolder).toBe(VALID_ENV.GOOGLE_DRIVE_FOLDER);
      expect(config.n8nBaseUrl).toBe(VALID_ENV.N8N_BASE_URL);
    });
  });

  it('uses default logLevel of info when not set', () => {
    withEnv({ LOG_LEVEL: undefined }, () => {
      const config = loadConfig();
      expect(config.logLevel).toBe('info');
    });
  });

  it('throws ConfigurationError when SUPABASE_URL is missing', () => {
    withEnv({ SUPABASE_URL: undefined }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('throws ConfigurationError when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    withEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('throws ConfigurationError when OPENAI_API_KEY is missing', () => {
    withEnv({ OPENAI_API_KEY: undefined }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('throws ConfigurationError when GOOGLE_DRIVE_FOLDER is missing', () => {
    withEnv({ GOOGLE_DRIVE_FOLDER: undefined }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('throws ConfigurationError when N8N_BASE_URL is missing', () => {
    withEnv({ N8N_BASE_URL: undefined }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('throws ConfigurationError when SUPABASE_URL is not a valid URL', () => {
    withEnv({ SUPABASE_URL: 'not-a-url' }, () => {
      expect(() => loadConfig()).toThrow(ConfigurationError);
    });
  });

  it('accepts custom LOG_LEVEL', () => {
    withEnv({ LOG_LEVEL: 'debug' }, () => {
      const config = loadConfig();
      expect(config.logLevel).toBe('debug');
    });
  });
});
