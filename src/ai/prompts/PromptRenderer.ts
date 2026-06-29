import { AppError } from '../../shared/errors/AppError';
import type { PromptTemplate } from './PromptTemplate';

export class PromptRenderer {
  render(template: PromptTemplate, variables: Record<string, string>): string {
    this.validateVariables(template, variables);

    return template.template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      return variables[key] ?? '';
    });
  }

  private validateVariables(template: PromptTemplate, variables: Record<string, string>): void {
    const missing = template.variables.filter(v => !(v in variables));
    if (missing.length > 0) {
      throw new AppError(
        `Missing required variables for prompt '${template.name}': ${missing.join(', ')}`,
        'PROMPT_MISSING_VARIABLES',
      );
    }
  }
}
