---
title: Develop an Interface locally
short: Develop locally
tier: enterprise
type: guide
order: 0
order_enterprise: 143
meta_title: Interfaces
meta_description: "Build and iterate on custom labeling Interfaces from your terminal using the Label Studio SDK CLI"
section: "Interfaces"
---

You can build or iterate on an Interface from your own editor and your own coding agent (Claude, Codex, or Cursor) instead of using the in-product agent. 

You write JSX on disk, preview it live against your Label Studio instance, and sync the result back when you're ready to publish.

Developing locally is useful when you want to:

- Use a coding agent or IDE you already have set up.
- Work offline against a checked-out copy of an Interface, then push the changes back.
- Bring an existing React mockup into Label Studio.
- Run automated validation and Playwright scenarios against your Interface before publishing.

<iframe width="560" height="315" src="https://www.youtube.com/embed/-xOjbN4PAhk?si=CUtfpYCxYQc0lRmx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 1. Install the label-studio-sdk package and check your setup

Before you begin, make sure you have:

- **The [`label-studio-sdk` Python package](https://github.com/HumanSignal/label-studio-sdk).** If you already have it installed, ensure you version 2.0.22 or later. 
   ```bash
   pip install --upgrade label-studio-sdk
   # or
   poetry add label-studio-sdk
   ```
- Node.js and npm available on your `PATH`.
- Your Label Studio Enterprise URL and an [API token](access_tokens).
- A coding agent installed (Claude, Codex, or Cursor) if you want agent assistance.

To begin, select **Interfaces** in the main menu and then select **Create Interface > Develop Locally**. 

!!! info Tip
    To iterate on an Interface that already exists in Label Studio, open the Interface details page and click **Develop Locally** in the top bar. The dialog respects the version currently selected in the [version navigator](interfaces-details#Versions).

## 2. Install the create-interface skill

Install the [`create-interface-skill`](/skills/interface.html) for your local coding agent. The skill includes the commands and conventions for working with Interfaces locally so your agent can author a valid Interface module.

In the **Develop Locally** modal, choose your agent and copy the install command:

| Agent | Install command |
| --- | --- |
| **Claude** | `npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a claude-code` |
| **Codex** | `npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a codex` |
| **Cursor** | `npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a cursor` |

Run the command in your terminal, then restart your agent so that it picks up the new skill. You only need to install the skill once per agent.

!!! info Tip
    You can skip this step if you'd rather write the Interface by hand. The skill is optional — it just gives your agent context.

## 3. Initialize the Interface

Use the SDK-provided command to initialize the Interface in a local directory:

```bash
export LABEL_STUDIO_URL="https://your-instance.humansignal.com"
export LABEL_STUDIO_API_KEY="<your token>"
label-studio-sdk interface init ./my-interface
cd ./my-interface
label-studio-sdk interface preview .
```

`interface init` scaffolds a starter `Screen.jsx`, `task.json`, and `scenarios.js` so you have a working baseline to build from.

!!! info Tip
    You can also pass `--lse-url` and `--token` to individual commands instead of exporting them. This is useful if you work against more than one Label Studio instance.


#### Start from an existing Interface

To iterate on an Interface that already exists in Label Studio, open the Interface details page and click **Develop Locally** in the top bar. The dialog respects the version currently selected in the [version navigator](interfaces-details#Versions).

Alternatively, you can use:
    
```bash
label-studio-sdk interface pull --id <interface-id> --version <version-id> ./my-interface
```
    
The dialog pre-fills the `--id` and `--version` for you. Without `--version`, `pull` grabs the latest version of the Interface, including any unpublished local drafts.

## 4. Check local setup

Run the following command to check your local setup:

```bash
label-studio-sdk interface doctor
```

The first validation or doctor run installs the Node validator dependencies into a user cache directory.

## 5. Start the live preview

Change into your Interface directory and run the preview command:

```bash
cd ./my-interface
label-studio-sdk interface preview .
```

This opens a **playground** in Label Studio (at the `interfaces/playground` URL) that is live-connected to your local environment. The playground watches your source files — every save reflects your latest changes in the preview in real time.

For example, if your Label Studio instance is at `https://your-instance.humansignal.com`, the playground will be at `https://your-instance.humansignal.com/interfaces/playground`.

## 6. Develop in your local environment

With the playground running, you can work in your familiar local tools — your IDE, terminal, or a coding agent on your machine — rather than editing in-product. Save your changes as you would for any other project, and the playground re-renders against the current sample task data.

## 7. Validate the Interface

Before syncing your changes, validate the Interface to catch any issues:

```bash
label-studio-sdk interface validate .
```

Static validation checks JSX compilation, the final module shape, schema exports, and runs smoke tests against `getResults` and `parseResults`. To also run any browser-driven Playwright scenarios you've defined in `scenarios.js`, add `--scenario`:

```bash
label-studio-sdk interface validate . --scenario scenarios.js
```

Validation also runs as part of `sync`, so you can skip this step if you'd rather catch issues at sync time. Use `--no-validate` on `sync` to bypass the check entirely.

## 8. Sync your changes back to Label Studio

Once your local code is ready, run the sync command to synchronize your local directory with the Label Studio instance:

| Mode | Sync command |
| --- | --- |
| **New Interface** | `label-studio-sdk interface sync . --title "My Interface" --workspace <id> --publish` |
| **Existing Interface** | `label-studio-sdk interface sync . --message "Describe the change"` |

Note the following:

* By default, `sync` creates an **unpublished local draft** so you can review the version in Label Studio before publishing. 

* Add `--publish` to publish the version immediately and make it available to new projects. The Develop Locally dialog includes `--publish` automatically when starting a new Interface from scratch and omits it when iterating on an existing one.

* For new Interfaces, the `--workspace` flag is optional. If you don't specify a workspace, the Interface will be created [in the **Shared** scope](interfaces#Interface-scope) (it can be used by projects in any workspace).

Useful flags for `sync`:

| Flag | Description |
| --- | --- |
| `--publish` | Publish the version immediately instead of leaving it as a draft. |
| `--message "..."` | Store a history message alongside the synced version. |
| `--dry-run` | Print the planned action without writing to the server. |
| `--workspace <id>` / `--workspace-title "..."` | Place a newly created Interface in a specific workspace. |
| `--force` | Upload even when the local source hash hasn't changed. |
| `--no-validate` | Skip the validation gate (compilation is still required). |

After a successful sync, the CLI writes a sidecar file (`Screen.jsx.ls-interface.json`) next to your source. 

The sidecar is keyed by Label Studio base URL and remembers the Interface ID, workspace, source version, and last pushed source hash, so future `sync`, `start`, and `open` commands don't need `--id`.

!!! info Tip
    Click **Refresh Versions** in the **Develop Locally** modal after a sync to see your new draft or published version appear on the Interface details page.

## Useful CLI commands

The full command reference is in the [**Interface CLI Guide**](https://github.com/HumanSignal/label-studio-sdk/blob/master/interface-cli.md). The most useful commands while developing locally are:

| Command | Description |
| --- | --- |
| `interface init <dir>` | Scaffold a starter Interface (`Screen.jsx`, `task.json`, `scenarios.js`). |
| `interface pull --id <id> <dir>` | Download an existing Interface to a local directory. Defaults to the latest version (including drafts) when `--version` isn't set. |
| `interface preview <dir>` | Open the live playground and watch the source for changes. |
| `interface validate <dir>` | Run static validation and (optionally) Playwright scenarios. |
| `interface sync <dir>` | Push local changes back to Label Studio. Creates a draft by default; add `--publish` to publish. |
| `interface start <dir>` | Sync the Interface, create a project that uses it, and open the project's Data tab. |
| `interface open <dir>` | Open the saved Interface in Label Studio using the local sidecar. |
| `interface doctor` | Check Node.js, npm, the API token, and connectivity. |

## Troubleshooting

| Error | What to do |
| --- | --- |
| `node is required for interface validation` | Install Node.js and make sure `node` is on your `PATH`. |
| `npm is required to install validator dependencies` | Install npm and re-run `interface doctor`. |
| `source did not compile` | Fix JSX syntax errors. Interface files are compiled as self-contained JSX snippets — `import` statements and bundler-specific syntax aren't supported. |
| `Module did not return an object` | Make the final expression in the file an object literal wrapped in parentheses, for example `({ default: Screen })`. |
| `Missing getResults` or `Missing parseResults` | Warnings during static validation, but required for scenario validation. Add both functions when you need reliable save/load behavior. |
| `no sidecar entry` | Run `interface sync` against the target Label Studio URL, or pass `--id` to commands that support it. |
| `multiple workspaces titled ...` | Pass `--workspace` with the numeric workspace ID instead of `--workspace-title`. |
