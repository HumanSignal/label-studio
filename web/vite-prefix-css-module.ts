import { createHash } from "node:crypto";

export const CSS_PREFIX = "lsf-";

/** Scoped names for `*.module.css`. `.prefix.css` files are global + PostCSS `postcss-prefix-lsf`, not CSS modules. */
export function cssModulesGenerateScopedName(name: string, filename: string): string {
  if (/^(antd|cm)?-|^anticon/.test(name)) return name;
  const hash = createHash("md5").update(`${filename}${name}`).digest("base64url").substring(0, 5);
  return `${name}--${hash}`;
}
