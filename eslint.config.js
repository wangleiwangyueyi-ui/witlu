import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
import tokenColors from './scripts/eslint/token-colors.mjs';
export default ts.config(
  { ignores: ['**/dist/**', '**/public/**'] }, js.configs.recommended, ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['packages/web/src/**/*.{ts,tsx}'], plugins: { witlu: { rules: { 'token-colors': tokenColors } } }, rules: { 'witlu/token-colors': 'error' } },
  { files: ['**/*.mjs'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);
