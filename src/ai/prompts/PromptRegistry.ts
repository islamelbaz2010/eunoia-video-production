import { AppError } from '../../shared/errors/AppError';
import type { PromptTemplate } from './PromptTemplate';

export class PromptRegistry {
  private readonly templates = new Map<string, Map<number, PromptTemplate>>();

  register(template: PromptTemplate): void {
    if (!this.templates.has(template.name)) {
      this.templates.set(template.name, new Map());
    }
    this.templates.get(template.name)!.set(template.version, template);
  }

  get(name: string, version?: number): PromptTemplate {
    const versions = this.templates.get(name);
    if (versions === undefined || versions.size === 0) {
      throw new AppError(`Prompt template '${name}' not found`, 'PROMPT_NOT_FOUND');
    }

    if (version !== undefined) {
      const tmpl = versions.get(version);
      if (tmpl === undefined) {
        throw new AppError(
          `Prompt template '${name}' version ${version} not found`,
          'PROMPT_NOT_FOUND',
        );
      }
      return tmpl;
    }

    const latest = Math.max(...versions.keys());
    return versions.get(latest)!;
  }

  has(name: string, version?: number): boolean {
    const versions = this.templates.get(name);
    if (versions === undefined) return false;
    if (version !== undefined) return versions.has(version);
    return versions.size > 0;
  }

  unregister(name: string, version?: number): void {
    if (version !== undefined) {
      this.templates.get(name)?.delete(version);
    } else {
      this.templates.delete(name);
    }
  }

  listNames(): string[] {
    return [...this.templates.keys()];
  }

  listVersions(name: string): number[] {
    const versions = this.templates.get(name);
    return versions !== undefined ? [...versions.keys()].sort((a, b) => a - b) : [];
  }
}
