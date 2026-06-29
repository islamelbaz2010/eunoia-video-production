import { createPromptTemplate, extractVariables } from '../../../src/ai/prompts/PromptTemplate';
import { TaskType } from '../../../src/ai/domain/types/TaskType';

describe('extractVariables', () => {
  it('extracts variable names from template', () => {
    const vars = extractVariables('Hello {{name}}, you have {{count}} messages');
    expect(vars.sort()).toEqual(['count', 'name']);
  });

  it('returns empty array when no variables', () => {
    expect(extractVariables('No variables here')).toEqual([]);
  });

  it('deduplicates repeated variables', () => {
    const vars = extractVariables('{{x}} and {{x}} again');
    expect(vars).toEqual(['x']);
  });
});

describe('createPromptTemplate', () => {
  it('creates a template with extracted variables', () => {
    const tmpl = createPromptTemplate(
      'greet',
      1,
      'Hello {{name}}!',
      TaskType.Chat,
      'Greeting template',
    );
    expect(tmpl.name).toBe('greet');
    expect(tmpl.version).toBe(1);
    expect(tmpl.variables).toEqual(['name']);
    expect(tmpl.taskType).toBe(TaskType.Chat);
    expect(tmpl.description).toBe('Greeting template');
  });

  it('stores the raw template string', () => {
    const tmpl = createPromptTemplate('t', 1, 'raw {{x}}', TaskType.Chat, 'd');
    expect(tmpl.template).toBe('raw {{x}}');
  });
});
