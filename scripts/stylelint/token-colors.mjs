import stylelint from 'stylelint';
import { hasHardcodedColor } from '../lib/style-rules.mjs';
import parse from 'postcss-value-parser';
import names from 'color-name';
const ruleName = 'witlu/token-colors';
const messages = stylelint.utils.ruleMessages(ruleName, { rejected: 'Use a PLAN 1.2 color token; literal colors and neutral grays are forbidden' });
export default stylelint.createPlugin(ruleName, enabled => (root, result) => {
  if (!enabled || root.source?.input.file?.replaceAll('\\', '/').endsWith('/packages/web/src/styles/tokens.css')) return;
  root.walkDecls(decl => {
    let literal = hasHardcodedColor(`${decl.prop}: ${decl.value}`);
    parse(decl.value).walk(node => { if (node.type === 'word' && Object.hasOwn(names, node.value.toLowerCase())) literal = true; });
    if (literal) stylelint.utils.report({ ruleName, result, node: decl, message: messages.rejected });
  });
});
