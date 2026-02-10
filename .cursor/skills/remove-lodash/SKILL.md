---
name: remove-lodash
description: Removes lodash imports from JS/TS files by replacing them with vanilla JS equivalents. Use when removing lodash from a file or directory, or when scanning the codebase for lodash usage.
---

# Remove Lodash

Systematically replace lodash imports with vanilla JS. See [replacements.md](replacements.md) for the full mapping.

## Workflow

1. **Scan** the target file or directory for `lodash/*` and `lodash` imports (e.g. `grep -r "lodash" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" <path>`).
2. **Build a todo list** of every file and lodash function to replace.
3. **Replace** each import using the mapping in [replacements.md](replacements.md). All replacement functions live in **@humansignal/core**; prefer importing from there:
   - `import { debounce, throttle, clamp, camelCase, snakeCase, kebabCase, capitalize, startCase, uniqBy, get, isMatch } from "@humansignal/core"`
4. **Remove** the lodash import line once all usages in that file are replaced.
5. **Lint** each changed file (ReadLints).
6. **Clean up** `package.json`: remove `lodash` from dependencies and resolutions when all imports are gone from that package.

## Behavioral notes

- **uniqBy**: Must keep **first** occurrence (Set-based filter). Do NOT use Map-based dedupe (that keeps last).
- Prefer importing from existing utils over inlining when the file can reach them (e.g. editor utils for editor files).
