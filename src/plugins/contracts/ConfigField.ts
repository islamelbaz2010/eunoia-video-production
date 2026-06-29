export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'secret';

export interface ConfigField {
  readonly type: ConfigFieldType;
  readonly required: boolean;
  readonly description: string;
  readonly default?: string | number | boolean;
}
