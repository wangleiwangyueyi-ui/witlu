import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';
import config from '../../stylelint.config.mjs';
describe('P1 actual color linters', () => {
  it.each(['#808080', '#888', 'gray', 'rgb(128 128 128)', 'linear-gradient(rebeccapurple, gray)'])('rejects %s in CSS', async value => {
    const result = await stylelint.lint({ code: `.example { color: ${value}; }`, config, codeFilename: 'packages/web/src/invalid.css' });
    expect(result.errored).toBe(true); expect(result.results[0].warnings.some(w => w.rule === 'witlu/token-colors')).toBe(true);
  });
  it('allows token-based glass surfaces', async () => {
    const result = await stylelint.lint({ code: '.glass { color: var(--text); background: color-mix(in srgb, var(--sky) 90%, transparent); }', config, codeFilename: 'packages/web/src/valid.css' });
    expect(result.errored).toBe(false);
  });
  it('rejects literal neutral gray in TSX through ESLint', async () => {
    const eslint = new ESLint(); const results = await eslint.lintText('export const Example = () => <svg><path fill="#808080" /></svg>;', { filePath: 'packages/web/src/Invalid.tsx' });
    expect(results[0].messages.some(m => m.ruleId === 'witlu/token-colors')).toBe(true);
  });
});
