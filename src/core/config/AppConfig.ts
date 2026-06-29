import { z } from 'zod';
import { ConfigurationError } from '../../shared/errors/AppError';

export const AppConfigSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseServiceRoleKey: z.string().min(1),
  openAiApiKey: z.string().min(1),
  googleDriveFolder: z.string().min(1),
  n8nBaseUrl: z.string().url(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const raw = {
    supabaseUrl: process.env['SUPABASE_URL'],
    supabaseServiceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    openAiApiKey: process.env['OPENAI_API_KEY'],
    googleDriveFolder: process.env['GOOGLE_DRIVE_FOLDER'],
    n8nBaseUrl: process.env['N8N_BASE_URL'],
    logLevel: process.env['LOG_LEVEL'],
    nodeEnv: process.env['NODE_ENV'],
  };

  const result = AppConfigSchema.safeParse(raw);

  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ConfigurationError(`Invalid configuration: ${messages}`);
  }

  return result.data;
}
