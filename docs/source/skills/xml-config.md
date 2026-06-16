---
title: create-xml-labeling-config-skill
short: XML labeling config
tier: all
type: skills
order: 2
meta_title: Create a Label Studio labeling config from your AI coding agent
meta_description: The create-xml-labeling-config-skill drafts a Label Studio XML labeling configuration from a plain-English task description, validates it, and pushes it to your Label Studio instance after you approve.
---

`create-xml-labeling-config-skill` is an agent skill that drafts a Label Studio XML labeling configuration from a plain-English description of your annotation task, validates the result against your running Label Studio instance, and — after you explicitly approve — pushes the config as a new project or as an update to an existing one.

Use it when you want an agent to create or iterate on a Label Studio project from a labeling brief: text classification, NER/span labeling, image bounding boxes, audio transcription, taxonomy review, ranking, pairwise comparison, time-series segmentation, and so on.

The skill is self-contained. Every rule and template it needs to write a correct config lives inside the skill's `references/config_guide.md`. There's no external knowledge base or MCP lookup at runtime.

## Install

```bash
# Claude Code
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a claude-code

# Codex
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a codex

# Cursor
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a cursor
```

Restart your agent after installing.

## Prerequisites

- A running Label Studio instance (community OSS or Enterprise) reachable from this machine. The skill defaults to `http://localhost:8080`.
- A Label Studio personal API key. Grab one from **Account & Settings → Access Token** in your instance.

If you don't have Label Studio installed yet:

```bash
pip install label-studio
label-studio start
```

Open `http://localhost:8080`, create an account, then copy your token from the Account page.

## Credentials

The skill reads from `.env` at the skill root:

```bash
cd ~/.skills/create-xml-labeling-config-skill   # or wherever your agent installed it
cp .env.example .env
# edit .env with your values
```

Required:

- `LABEL_STUDIO_URL` — base URL, e.g. `http://localhost:8080`
- `LABEL_STUDIO_API_KEY` — personal API token from the Account page

`LABEL_STUDIO_API_KEY` is optional in the sense that the skill still runs without it — local structural validation works, and you'll get the config saved to disk. The server-side validation and the push step are skipped with a warning.

## Use

Ask your agent to use the skill:

```text
Use $create-xml-labeling-config-skill to build a labeling config for
sentiment classification with labels Positive / Neutral / Negative.
```

Other example prompts:

- *"Use `$create-xml-labeling-config-skill` to make an NER config for legal contracts with labels Party / Date / Amount / Clause type."*
- *"Use `$create-xml-labeling-config-skill` to set up a Label Studio project for image bounding boxes — labels Person, Vehicle, Animal."*
- *"Use `$create-xml-labeling-config-skill` to update project 42 with a 'rationale' text area on the rating config."*

## What a run looks like

For each run, the skill:

1. **Asks one or two quick questions** if it can't pick the object tag, control tags, and labels with confidence. If your brief is unambiguous it skips ahead.
2. **Drafts the XML** using the baked-in authoring guide. It starts from the closest template and adapts.
3. **Validates the config locally** with `validate_config.py`. This catches malformed XML, missing/duplicate `name` attributes, `toName` pointing at a non-existent or non-object tag, bad nesting, `style=` / `className=` on the wrong tags, and deprecated tags (`AudioPlus`, `Repeater`).
4. **Validates the config against your Label Studio instance** when an API key is set. The script posts the config to a throwaway project on your instance, lets Label Studio's own validator run, and deletes the project immediately. This catches engine-level issues — unknown tag combinations, mismatched control/object types, attributes that don't work together.
5. **Shows you the config, a sample task JSON, any assumptions it made, and validation status.** You review and either approve or redirect.
6. **Pushes on explicit approval.** Either as a new project (`--title "..." --description "..."`) or as an update to an existing project (`--project-id N`).
7. **Opens the sample tasks file** so you can drag-and-drop it into the new project's Data Manager.

## What you get per run

- A `.xml` config saved to `/tmp/labeling-config-<slug>-<date>.xml`
- A sample task JSON at the sibling path `/tmp/labeling-config-<slug>-<date>.tasks.json`, always written as a JSON list so Data Manager imports it without reshaping
- Local + server-side validation results
- After your approval: the project URL in your Label Studio instance

## How the validator works

`validate_config.py` runs three layers:

1. **XML well-formedness** — must parse as XML with a single `<View>` root.
2. **Structural rules** baked from the Label Studio authoring guide:
   - every object/control tag has a `name`
   - all `name`s are unique
   - every control tag's `toName` points at an existing object tag
   - `<Pairwise>` allows two comma-separated `toName` targets
   - `<Label>` / `<Choice>` nesting rules
   - `style=` only on `View` / `Filter` / `Header`; `className=` only on `View`
   - no deprecated tags
   - `visibleWhen` consistency between a `<View>` and the controls it wraps
3. **Server-side** (with `--server`) — posts the config to your Label Studio instance and lets Label Studio's own validator run.

You can run the validator directly on any file:

```bash
python3 scripts/validate_config.py /tmp/my-config.xml
python3 scripts/validate_config.py /tmp/my-config.xml --server
python3 scripts/validate_config.py /tmp/my-config.xml --server --project-id 42
python3 scripts/validate_config.py - < my-config.xml
python3 scripts/validate_config.py /tmp/my-config.xml --json   # machine-readable
```

Exit code is `0` only if every requested check passes.

## How the push works

`push_config.py` either creates a new project from the config or updates an existing project's `label_config`:

```bash
# New project
python3 scripts/push_config.py /tmp/my-config.xml --title "Legal NER"

# Update existing
python3 scripts/push_config.py /tmp/my-config.xml --project-id 42

# Dry-run (no network call)
python3 scripts/push_config.py /tmp/my-config.xml --title "Test" --dry-run
```

On success it prints the project URL.

A note on updates: if the existing project already has annotations, Label Studio may reject changes that would invalidate them — for example, renaming a `Choices` tag. Keep the object/control `name`s stable across updates, or create a fresh project if you need a breaking change.

## What this skill does NOT do

- **Import your data.** The skill pushes the labeling configuration only. After you have the project URL, import tasks via Data Manager, the [Label Studio SDK](https://labelstud.io/sdk/) (`ls.projects.import_tasks(...)`), or **Project Settings → Cloud Storage**.
- **Generate custom React interfaces.** That's 🔒 [`create-interface-skill`](/skills/interface.html)'s job (Label Studio Enterprise only). If your ask mentions ReactCode or a custom interface, this skill hands off to that one.
- **Sync changes back from Label Studio.** The flow is one-way: skill → Label Studio. If you tweak the config in the Label Studio UI after pushing, the skill won't pull those changes back.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Could not reach Label Studio at http://localhost:8080` | Label Studio isn't running, or your `LABEL_STUDIO_URL` is wrong. Confirm with `curl http://localhost:8080/health`. |
| `--server requested but LABEL_STUDIO_API_KEY is not set` | Set `LABEL_STUDIO_API_KEY` in `.env`. Get the token from the Account page. |
| `Label Studio rejected the config (HTTP 400): label_config: ...` | Label Studio's engine-level validator caught something. The error is usually specific (`toName` mismatch, unknown attribute). Fix and re-validate. |
| `Label Studio rejected config update for project N (HTTP 400): ... annotations` | The update would invalidate existing annotations. Keep names stable, or create a new project. |
| Config passes both validators but the Label Studio UI behaves oddly | Almost always a missing attribute on a control tag. Re-read the relevant tag's section in `references/config_guide.md` inside the installed skill. |

## Source

[github.com/HumanSignal/create-xml-labeling-config-skill](https://github.com/HumanSignal/create-xml-labeling-config-skill)
