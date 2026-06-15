---
title: Interfaces overview
short: Overview
tier: enterprise
type: guide
order: 0
order_enterprise: 141
meta_title: Interfaces
meta_description: "Build custom labeling interfaces with React"
section: "Interfaces"
---

The Interfaces builder allows you to build highly customized labeling UIs to use across your Label Studio projects. 

Instead of choosing a template and tuning [out-of-the-box XML tags](/tags), with Interfaces you describe the experience you want and Label Studio builds a fully interactive React-based labeling UI that you can preview, refine, save, and share across projects.

<iframe width="560" height="315" src="https://www.youtube.com/embed/pdcZ6HDwpiI?si=ZpeuyeKYx71q1vCR" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## When to use Interfaces

Interfaces are Label Studio's most powerful UI builder. Use them when:

* [Label Studio's XML tags](/tags) don't support your use case. For example, if you want to annotate data types that do not have a corresponding object tag (3D files, GEOTiff, DICOM, etc). 
* When you want to be able to vibe code your labeling UI either within Label Studio or using your own tools and agent outside of Label Studio. To work with a coding agent like Claude Code, Codex, or Cursor, install the [`create-interface-skill`](/skills/interface.html) — or see the full [agent skills overview](/skills/).
* When you need to be able to version your labeling UIs. 
* When you need more custom logic. 

For a full comparison between Interfaces and classic Label Studio tags, see [Interfaces vs. classic tags](#Interfaces-vs-classic-tags).


## Project and feature integration

Once saved, you can use the Interface to create new projects (subject to the workspace scope — see [Interface scope](#Interface-scope)). The project uses the Interface to render the labeling UI.

Because annotations are still stored as regular Label Studio results, standard review workflows and exports continue to work.

| Feature | Notes |
|---------|-------|
| **Prompts** | The Interface's output schema instructs Prompts how to turn an LLM's structured response into Label Studio annotations, so you can pre-label tasks and have humans review. |
| **Agreements** | You can view and explore agreement as you would with any other task. <br/>However, you cannot customize per-control-tag agreement metrics. |
| **Analytics** | You can use the dashboards to visualize annotation and review work as you would with any other Label Studio project. |
| **Project settings** | There is no change or restriction on project settings when configuring a project that has an Interface attached. |
| **Plugins** | Plugins are not supported with Interfaces. Instead, you can directly include plugin-type functionality within your Interface code. |
| **XML tags** | Interfaces do not incorporate classic XML tags and cannot be combined with a classic XML labeling interface.   |

## Interfaces vs. classic tags

| Feature | Classic XML tags | Interfaces |
| --- | --- | --- |
| Format | XML tag library | React / agent-generated code |
| How to build | Configure XML or template selection | Natural-language prompting via the Label Studio agent or coding agent with skills.md |
| Iteration speed | Moderate | Extremely fast (prompt → refine → ship) |
| Multi-modal support | Supported, but constrained | Fully flexible and supports data not supported by traditional XML tags (3D data, geotiff, etc) |
| Business logic | Implemented via plugins as separate code that hooks into the configuration | Written directly into the Interface component |
| AI automation | Connect models via ML backend | ML backend, native model integration, supported in Prompts for LLM-as-a-judge pre-labeling or evaluation with |
| Reusability across projects | Configuration is project-scoped; reuse means duplication and drift | Interfaces are first-class objects — port one to any project without copying |
| Versioning | Limited | Built-in version history with one-click rollback |
| Access control | Project-level | Workspace- or project-level access on the Interface itself |
| Backend integration | Yes | Yes  |
| Agent compatibility | No | Yes (Label Studio agent or select your own) |
| Guardrails | Tag library enforces compatibility | Agent runs separate from your production environment |



## Interface scope

There are template Interfaces, shared Interfaces, and Interfaces scoped to specific workspaces. 

Template Interfaces are the quickest way to get started; shared and workspace scopes let teams standardize on a shared set of labeling experiences.

| Scope        | Who can see it                          | Who can edit it                                  |
|--------------|-----------------------------------------|--------------------------------------------------|
| **Templates**   | Everyone in your organization          | No one — HumanSignal-maintained, read-only. However, you can duplicate a system interface and edit the copy. |
| **Shared**   | Everyone in your organization           | Anyone with the appropriate [permissions](#User-access)          |
| **Workspace**| Members of the chosen workspace only    | Owners and Admins, or Managers who are members of that workspace                        |

Note the following:

- **Template interfaces are read-only.** You cannot modify or delete a HumanSignal-provided template — duplicate it first and edit the copy.

- **Scope changes are structural.** Moving an Interface between shared and workspace scope can change who is able use it to create new projects.  


## Security

### User access

| Role | Access |
|------|--------|
| **Owners and Admins** | Can create and edit shared Interfaces and for any workspace |
| **Managers** | Can create and edit shared Interfaces and for any workspace in which they are a member |
| **Annotators and Reviewers** | Do not have access to the Interfaces feature |

### Admin controls

You can enable or disable the ability to create and edit Interfaces for your organization. For more information, see [Interfaces settings](admin-interfaces).

### Sandboxing

Interfaces run as sandboxed modules rendered inside the Label Studio editor shell. To keep them safe, portable, and upgrade-friendly, the runtime enforces a narrow contract:

- **React-only, no external packages.** The code runs with `React` and the standard hooks (`useState`, `useRef`, `useEffect`, `useCallback`, `useMemo`) plus a small `getField` helper. You cannot `import` arbitrary npm packages, UI libraries, or design systems.
- **Plain JavaScript with JSX.** No TypeScript, no type annotations, no `import` / `export` statements. The module is compiled and evaluated at runtime, and must expose a default component plus optional helpers (`getResults`, `parseResults`, `outputSchema`, `inputSchema`, `paramsSchema`, `GridCell`).
- **No direct network access.** Interfaces render task data that Label Studio provides; they don't make their own API calls. Use project settings, ML backends, or Prompter for anything that needs external services.
- **Limited persistence.** State lives only for the duration of a labeling session. Anything you want to keep has to come back out through the annotation results.



