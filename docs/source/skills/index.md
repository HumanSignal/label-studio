---
title: Skills overview
short: Overview
tier: all
type: skills
order: 1
meta_title: Label Studio agent skills
meta_description: Use HumanSignal agent skills to set up labeling projects and custom interfaces from inside your AI coding agent.
---

HumanSignal publishes a small set of **agent skills** that let you set up and iterate on Label Studio projects from inside an AI coding agent (Claude Code, Codex, Cursor, and other agents supported by the `skills` CLI). Each skill is a self-contained package: a workflow prompt, baked-in reference material, and small Python helper scripts that talk to your Label Studio instance over its public API.

Skills with the lock emoji 🔒 next to their name are only available for Label Studio Enterprise users.

Two skills are currently published:

| Skill | What it does | Tier |
|---|---|---|
| [`create-xml-labeling-config-skill`](/skills/xml-config.html) | Drafts a Label Studio XML labeling configuration from a plain-English task description, validates it locally and against your running Label Studio instance, and (after explicit approval) pushes it as a new project or as an update to an existing one. | OSS + Enterprise |
| 🔒 [`create-interface-skill`](/skills/interface.html) | Generates a HumanSignal Interface — a single-file JSX annotation screen for Label Studio Enterprise — exporting `paramsSchema` / `outputSchema` / `getResults` / `parseResults` and the parenthesized-object-literal trailer the runtime requires. | Enterprise |

## When to use which

- **You want a standard labeling project** — text classification, NER/span labeling, image bounding boxes, audio transcription, taxonomy review, ranking, pairwise comparison, time-series segmentation. Use [`create-xml-labeling-config-skill`](/skills/xml-config.html). It writes an XML config using Label Studio's built-in tags, which is the right runtime for the vast majority of projects.

- **You need a custom React-based UI** — the built-in tags don't cover your case, you're working with data types that don't have a standard object tag (3D, GEOTiff, DICOM), or you want to vibe-code your labeling screen. Use 🔒 [`create-interface-skill`](/skills/interface.html). The output is a single JSX file you can paste into the Label Studio Enterprise Interfaces editor or sync with the [`label-studio-sdk` CLI](https://github.com/HumanSignal/label-studio-sdk).

If you're not sure which to start with, start with the XML config skill. It's the lighter-weight path and works on every Label Studio install.

## How a skill run is structured

Both skills follow the same general shape:

1. **You describe the task** in plain English ("NER for legal contracts with labels Party / Date / Amount / Clause type"). The skill asks one or two clarifying questions if it really needs them; otherwise it picks sensible defaults and surfaces its assumptions at the approval gate.
2. **The agent drafts** the XML config or JSX interface using the skill's baked-in reference material. No external knowledge base or runtime lookup is required.
3. **Local validation runs automatically.** Both skills ship Python scripts that catch structural issues before anything reaches your Label Studio instance.
4. **The agent shows you the config / interface, a sample task, and any assumptions it made**, then waits for an explicit yes.
5. **On approval, the skill pushes to Label Studio.** Either as a new project, or — for the config skill — as an update to an existing `--project-id`.

The approval gate in step 4 is load-bearing: neither skill writes to your Label Studio instance without you explicitly saying yes. If the agent gets an assumption wrong, you redirect at the gate and the skill iterates.

## Install

Both skills install through the `skills` CLI, which targets the agent of your choice.

### `create-xml-labeling-config-skill`

```bash
# Claude Code
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a claude-code

# Codex
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a codex

# Cursor
npx skills add humansignal/create-xml-labeling-config-skill --skill create-xml-labeling-config-skill -g -a cursor
```

### `create-interface-skill`

```bash
# Claude Code
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a claude-code

# Codex
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a codex

# Cursor
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a cursor
```

Restart your agent after installing.

## Credentials

Both skills read from a `.env` at the skill root. The variables they look for:

| Variable | Used by | Required? |
|---|---|---|
| `LABEL_STUDIO_URL` | both | Yes for the server-side validation and push steps. Defaults to `http://localhost:8080`. |
| `LABEL_STUDIO_API_KEY` | both | Yes for the server-side validation and push steps. Skip and local validation still runs, but you'll have to upload the config manually. |

Get your API key from **Account & Settings → Access Token** in your Label Studio instance.

## Source

- [github.com/HumanSignal/create-xml-labeling-config-skill](https://github.com/HumanSignal/create-xml-labeling-config-skill)
- [github.com/HumanSignal/create-interface-skill](https://github.com/HumanSignal/create-interface-skill)
