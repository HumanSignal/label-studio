/** Mock rehype-raw (ESM-only) so editor Markdown can load when ui tests import the barrel. */
export default function rehypeRaw() {
  return () => {};
}
