export default {
  meta: { type: 'problem', schema: [], messages: { literal: 'Use a PLAN 1.2 CSS color token instead of a literal color.' } },
  create(context) {
    return { Literal(node) {
      if (typeof node.value === 'string' && /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\(/i.test(node.value)) context.report({ node, messageId: 'literal' });
      if (typeof node.value === 'string' && /^(black|white|gr[ae]y|red|blue|green|gold|coral|purple|navy|teal)$/i.test(node.value)) {
        const parent = node.parent;
        const name = parent.type === 'JSXAttribute' ? parent.name.name : parent.type === 'Property' && parent.key.type === 'Identifier' ? parent.key.name : '';
        if (/color|fill|stroke|background|shadow/i.test(String(name))) context.report({ node, messageId: 'literal' });
      }
    } };
  }
};
