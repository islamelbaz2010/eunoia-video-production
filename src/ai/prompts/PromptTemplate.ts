import type { TaskType } from '../domain/types/TaskType';

export interface PromptTemplate {
  readonly name: string;
  readonly version: number;
  readonly template: string;
  readonly variables: ReadonlyArray<string>;
  readonly taskType: TaskType;
  readonly description: string;
}

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  VARIABLE_PATTERN.lastIndex = 0;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    if (match[1] !== undefined) {
      found.add(match[1]);
    }
  }
  return [...found];
}

export function createPromptTemplate(
  name: string,
  version: number,
  template: string,
  taskType: TaskType,
  description: string,
): PromptTemplate {
  return {
    name,
    version,
    template,
    variables: extractVariables(template),
    taskType,
    description,
  };
}
