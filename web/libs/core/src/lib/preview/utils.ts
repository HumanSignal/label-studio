/**
 * Utility functions for preview components
 */

/**
 * Count the number of XML tags in a config string.
 * Uses a simple regex to count opening tags (excluding self-closing markers).
 */
export function countConfigTags(config: string): number {
  if (!config) return 0;
  // Match opening tags like <View, <Labels, <Image etc.
  // This counts all tags including self-closing ones
  const matches = config.match(/<[A-Za-z][A-Za-z0-9]*/g);
  return matches ? matches.length : 0;
}
