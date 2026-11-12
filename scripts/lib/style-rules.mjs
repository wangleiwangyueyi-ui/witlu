export function hasHardcodedColor(text) {
  return /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\(/i.test(text) ||
    /(?:[:=]\s*["']?)(?:black|white|gray|grey|red|blue|green|gold|coral|purple|silver|navy|teal|cyan|magenta)\b/i.test(text);
}
