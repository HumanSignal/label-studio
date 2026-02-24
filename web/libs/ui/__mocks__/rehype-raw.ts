/** Mock rehype-raw (ESM-only) for Jest so editor Markdown can load when ui tests import the barrel. */
export default function rehypeRaw() {
  return () => {};
}
