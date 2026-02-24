/**
 * Mock rehype-raw for Jest tests
 *
 * rehype-raw is an ESM-only package used by react-markdown to parse raw HTML in markdown.
 * Since we mock react-markdown in tests, we also need to mock this plugin to prevent
 * Jest parsing errors.
 *
 * This mock provides a no-op plugin that satisfies the import without any functionality.
 */
export default function rehypeRaw() {
  return () => {};
}
