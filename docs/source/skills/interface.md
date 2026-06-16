---
title: create-interface-skill 🔒
short: Interface builder 🔒
tier: all
type: skills
order: 3
meta_title: Create a Label Studio Enterprise Interface from your AI coding agent
meta_description: The create-interface-skill generates a HumanSignal Interface — a single-file JSX annotation screen — from a plain-English description, validates it locally, and is ready to paste into the Interfaces editor or sync via the Label Studio SDK CLI.
---

`create-interface-skill` is an agent skill that generates a [HumanSignal Interface](https://docs.humansignal.com/guide/interfaces.html): a single-file JSX annotation screen for Label Studio Enterprise. The output is one `.jsx` source file whose final expression is a parenthesized object literal exporting a `default` React component plus the optional `paramsSchema`, `outputSchema`, `getResults`, and `parseResults` hooks the Interfaces runtime expects.

!!! note
    Interfaces are a Label Studio Enterprise feature. This skill page is visible on the open-source docs so OSS readers can learn what the skill does, but the generated Interface itself only runs on a Label Studio Enterprise instance.

Use this skill when you want an agent to create or iterate on a labeling UI: text classification, NER/span labeling, Document AI workflows, data review screens, or conversions from a React or Claude Design prototype into the Interface format.

## When to use create-interface-skill instead of the XML config skill

If a standard Label Studio config could do the job — built-in object and control tags, no custom logic — use [`create-xml-labeling-config-skill`](/skills/xml-config.html) instead. It's the lighter-weight path.

Reach for `create-interface-skill` when:

- The built-in tags don't cover your data type or interaction (3D, GEOTiff, DICOM, custom widgets).
- You need conditional logic, custom validation, or per-task UI variations that classic tags can't express.
- You want to vibe-code your labeling UI — describe it, see it, tweak it.
- You're porting a React or Claude Design mockup into a Label Studio annotation screen.

## Install

```bash
# Claude Code
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a claude-code

# Codex
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a codex

# Cursor
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a cursor
```

Restart your agent after installing.

## Prerequisites

- A Label Studio Enterprise instance you can publish Interfaces to.
- Optional but strongly recommended: the [`label-studio-sdk` CLI](https://github.com/HumanSignal/label-studio-sdk) installed and on your `PATH`. The skill uses it to validate, preview, and sync interfaces from the command line. Without the SDK, the skill falls back to static checks against the rules in `references/authoring-rules.md`.

## Use

Ask your agent to use the skill:

```text
Use $create-interface-skill to build an interface for classifying support tickets by urgency and product area.
```

Other prompts the skill is designed for:

- *"Use `$create-interface-skill` to convert this Claude Design mockup into a Label Studio interface."*
- *"Use `$create-interface-skill` to build a Document AI review screen with redactable PII spans and a confidence-score field."*
- *"Use `$create-interface-skill` to update my existing interface so reviewers can leave per-region comments."*

## Start a local interface

If you have the SDK CLI installed, the recommended pattern is to create a local interface workspace first:

```bash
label-studio-sdk interface init ./my-interface
cd ./my-interface
```

That scaffold gives you three editable files:

```text
Screen.jsx        # the interface source — what the agent edits
task.json         # sample task data for local preview and validation
scenarios.js      # browser-driven interaction checks (optional)
```

Then point your agent at `Screen.jsx`:

```text
Use $create-interface-skill to edit Screen.jsx to add a "needs-review" tag toggle per region.
```

## Local validation and preview

From a local interface directory:

```bash
# Validate the whole directory
label-studio-sdk interface validate .

# Validate a single file
label-studio-sdk interface validate ./Screen.jsx

# Run browser-driven scenarios (if present)
label-studio-sdk interface validate . --scenario scenarios.js

# JSON output for piping into another tool / agent
label-studio-sdk interface validate . --json

# Preview in a local browser
label-studio-sdk interface preview .
```

When validation passes and the preview looks right, sync back to Label Studio:

```bash
# Push a draft
label-studio-sdk interface sync . --message "Describe the change"

# Push and publish in one step
label-studio-sdk interface sync . --message "Describe the change" --publish
```

If the SDK CLI isn't installed, the skill still runs and emits the JSX file. It checks the file statically: plain JSX only, no `import` / `require` / `export`, no TypeScript syntax, a trailing parenthesized object literal with `default`, stable region IDs across renders, and aligned `paramsSchema` / `outputSchema` / `getResults` / `parseResults`.

## The Interfaces runtime contract

Every Interface is one `.jsx` source file whose last expression is a parenthesized object literal. Here's the minimal skeleton:

```jsx
const MyInterface = (props) => {
  const { task, regions, params, addRegion, updateRegion, deleteRegion, readOnly } = props;
  const text = getField(task.data, params?.textField ?? "text") ?? "";

  return (
    <div style={{ padding: 24 }}>
      <pre style={{ whiteSpace: "pre-wrap" }}>{String(text)}</pre>
    </div>
  );
};

const paramsSchema = {
  type: "object",
  properties: {
    textField: {
      type: "string",
      title: "Text field",
      default: "text",
    },
  },
};

const outputSchema = {
  type: "object",
  properties: {},
};

function getResults(regions, relations) {
  return [];
}

function parseResults(results) {
  return { regions: [], relations: [] };
}

({
  default: MyInterface,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
})
```

A few rules the runtime enforces, which the skill follows automatically:

- **No module syntax.** The source is evaluated as a function body, not as an ES module. No `import`, `require`, or `export`. No TypeScript syntax.
- **No primary Submit/Update button in the canvas.** The Interfaces shell owns submission. If you need extra bottom-bar actions, use the `BottomBarExtra` slot.
- **Don't generate new region IDs during render.** Reuse existing IDs from `props.regions`. Mint new IDs only inside event handlers or in `parseResults`.
- **No persistent `localStorage` / `sessionStorage`.** The sandbox may reset them on iframe remount.
- **Reference `EditorUI` only inside component render functions.** Admin-time schema extraction may not inject it.

The skill's `references/runtime-contract.md` has the full prop list, region shape, relation shape, and shell-slot reference. The skill loads it on demand for non-trivial interfaces.

## What this skill does NOT do

- **Generate XML configs.** For standard labeling UIs built from Label Studio's classic tags, use [`create-xml-labeling-config-skill`](/skills/xml-config.html).
- **Use the legacy `<ReactCode>` XML tag.** This is the new JSX-based Interfaces runtime. If you specifically need `<ReactCode>`, ask for it explicitly.
- **Build a multi-file app, package, or build config.** Interfaces are one `.jsx` file. The skill keeps the output pasteable into the Interfaces editor.

## Source

[github.com/HumanSignal/create-interface-skill](https://github.com/HumanSignal/create-interface-skill)
