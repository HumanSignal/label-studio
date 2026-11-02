#!/usr/bin/env bash
# Builds dist/design-sync/ui — the compiled @humansignal/ui package design-sync bundles.
# Run from services/lso/web. Output: index.cjs + icons.cjs + style.css + assets/ (vite, same
# pipeline as the reference storybook) and types/ (tsc declarations).
set -euo pipefail
cd "$(dirname "$0")/../.."

OUT=dist/design-sync/ui

node .design-sync/build/gen-icons-entry.mjs
bun --bun run vite build --config .design-sync/build/vite.config.ts

# Declarations (pre-existing type errors are non-blocking; declaration-emit errors fail the build).
node .design-sync/build/build-dts.mjs

# Types entry: ds-entry.ts's re-exports, repointed into types/ (CSS side-effect imports dropped).
sed -n 's#^export \* from "\.\./\.\./\(.*\)";#export * from "./\1";#p' .design-sync/build/ds-entry.ts > "$OUT/types/index.d.ts"

cat > "$OUT/package.json" <<'EOF'
{
  "name": "@humansignal/ui",
  "version": "0.0.0",
  "private": true,
  "main": "index.cjs",
  "types": "types/index.d.ts"
}
EOF

# Canonical design tokens (generated from design-tokens.json) as a readable tokens/ file for the design agent.
# Same declarations the compiled style.css already carries; colors.prefix.css is the deprecated legacy palette — left out.
TOK=dist/design-sync/ui-tokens
rm -rf "$TOK" && mkdir -p "$TOK"
cp libs/ui/src/tokens/tokens.prefix.css "$TOK/tokens.css"
echo '{ "name": "@humansignal/ui-tokens", "version": "0.0.0", "private": true }' > "$TOK/package.json"

echo "built $OUT"
