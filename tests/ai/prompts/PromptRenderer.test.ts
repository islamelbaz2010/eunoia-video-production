import { createPromptTemplate } from '../../../src/ai/prompts/PromptTemplate';
import { PromptRenderer } from '../../../src/ai/prompts/PromptRenderer';
import { AppError } from '../../../src/shared/errors/AppError';
import { TaskType } from '../../../src/ai/domain/types/TaskType';

function makeTemplate(template: string) {
  return createPromptTemplate('test', 1, template, TaskType.Chat, 'test');
}

describe('PromptRenderer', () => {
  let renderer: PromptRenderer;

  beforeEach(() => {
    renderer = new PromptRenderer();
  });

  it('renders a template with all variables', () => {
    const tmpl = makeTemplate('Hello {{name}}, you are {{age}}.');
    const result = renderer.render(tmpl, { name: 'Alice', age: '30' });
    expect(result).toBe('Hello Alice, you are 30.');
  });

  it('throws AppError when required variables are missing', () => {
    const tmpl = makeTemplate('Hello {{name}}');
    expect(() => renderer.render(tmpl, {})).toThrow(AppError);
  });

  it('throws with PROMPT_MISSING_VARIABLES code', () => {
    const tmpl = makeTemplate('{{a}} and {{b}}');
    try {
      renderer.render(tmpl, { a: '1' });
      fail('should have thrown');
    } catch (e) {
      expect((e as AppError).code).toBe('PROMPT_MISSING_VARIABLES');
    }
  });

  it('renders template with no variables unchanged', () => {
    const tmpl = makeTemplate('Static prompt with no vars.');
    expect(renderer.render(tmpl, {})).toBe('Static prompt with no vars.');
  });

  it('handles repeated variables', () => {
    const tmpl = makeTemplate('{{x}} and {{x}}');
    expect(renderer.render(tmpl, { x: 'hello' })).toBe('hello and hello');
  });
});
