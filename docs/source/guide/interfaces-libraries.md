---
title: Use external libraries and services in an Interface
short: External libraries & APIs
tier: enterprise
type: guide
order: 0
order_enterprise: 146
meta_title: Use external libraries and network services in Label Studio Interfaces
meta_description: "How to call external APIs, load third-party packages, or bundle libraries directly into a Label Studio Interface — and which security setting each one needs."
section: "Interfaces"
---

An Interface runs as a **sandboxed module** inside the Label Studio editor. By default that sandbox has **no outbound network and cannot load third-party code** — a deliberate security posture, not a hard limitation. When your Interface genuinely needs an external API or a third-party library, you unlock exactly what you need, in one of three ways.

The single most common point of confusion is that **"call an external API" and "use an external package" are unlocked in different places.** Allow-listing a host in the wrong section silently does nothing. This page explains which is which.

## The three paths at a glance

| You want to… | Example | Where to enable |
|---|---|---|
| **Call an external HTTP service** from your Interface | `fetch()` your ML backend, a geocoder, an internal microservice, a tile server | **Organization > Settings > Interfaces → API origins** |
| **Load a third-party package from a CDN** at runtime | Pull `three.js` or `d3` from `cdn.jsdelivr.net` via a `<script>` tag | **Organization > Settings > Interfaces → Advanced: external scripts** |
| **Use a third-party package with no external network** | Bundle `three.js` *into* the Interface and publish it | Nothing to configure — the code is self-contained. |

You can combine them. A point-cloud Interface might **bundle `three.js` locally** (path 3) *and* **allow-list your tile/asset server** under **API origins** (path 1) so it can fetch the data to render.

!!! info Can I use a third-party library?
    Yes. Interface source code can't use `import` / `require` — each Interface is one self-contained module, not an ES module — but that's a limit on **module syntax**, not a ban on third-party code. Bring a library in by loading it from an allow-listed CDN (path 2) or by bundling it into the Interface (path 3).

---

## Path 1 — Call an external API or service (API origins)

Use this when your Interface needs to talk to an HTTP service over `fetch`, `XHR`, or `WebSocket` — for example, sending a selected region to an ML backend for inference, geocoding an address, or pulling map tiles.

1. Go to **Organization > Settings > Interfaces → API origins**.
2. Add the exact origin — scheme **and** host, e.g. `https://api.example.com`. One host per entry.
3. Save. Your Interface's `fetch()` calls to that origin now succeed.

| Rule | Detail |
|---|---|
| Format | Full origin including scheme (`https://host`). |
| Wildcards | Not allowed (no `*` or `*.example.com`). List each host explicitly. |
| Your LS server | Always allowed automatically — don't add it. Only list third-party hosts. |
| Empty list | **No outbound network.** The Interface can only reach your Label Studio server. |

**API origins** governs **data requests only** — it does **not** let you load a `<script>` from that host. If you add a package CDN here expecting a library to load, nothing happens (use Path 2 for that).

!!! info Example
    To connect a custom ML backend to an Interface, you allow-list the backend's origin here — that is what lets the Interface send region payloads to it and render the predictions. No package is being installed; it's an API call.

---

## Path 2 — Load a package from a CDN (Advanced: external scripts)

Use this when you want the convenience of pulling a library straight from a CDN at runtime and you **trust that host completely**.

1. Go to **Organization > Settings > Interfaces → Advanced: external scripts**.
2. Turn on **Allow external scripts / stylesheets**.
3. Add one or more script origins, e.g. `https://cdn.jsdelivr.net`.
4. In your Interface, load the library from that origin (for example, inject a `<script>` and use its global).

| Rule | Detail |
|---|---|
| Scheme | Must be `https://`. HTTP origins are rejected. |
| Format | Origin only — no paths, query strings, credentials, or fragments. |
| Wildcards | Not allowed. |
| Toggle | Origins are ignored unless the checkbox is on. Turning it off clears the list on save. |

This is a different setting from **API origins**. A host listed here can serve executable code to your Interface; a host listed under **API origins** cannot, and vice versa.

!!! warning
    Scripts loaded from these origins run with the Interface's **full privileges** and can read any task data the Interface is rendering. Only add hosts you trust completely. Most organizations should leave this section disabled and prefer **Path 3**.

---

## Path 3 — Bundle a package locally (nothing to allow-list, no network)

**Recommended for locked-down, on-premise, or air-gapped deployments, and for any team that would rather not open an outbound origin or trust a CDN.**

Because an Interface is a **single self-contained module**, a third-party library can travel *inside* your Interface code. The library becomes part of what you publish — there is no CDN, no `<script>` tag, no allow-list entry, and no outbound network at label time.

**How to do it**

1. Get a **browser build that attaches to a variable** — a prebuilt single-file `dist`, or produce one with a bundler (for example, `esbuild --bundle --format=iife --global-name=MyLib`). Interface source is compiled but **not** bundled for you, so resolve the dependency into this one file first. Avoid an **ES-module** build: `import` / `export` statements aren't supported.
2. Include that code in your Interface source and reference the library through the variable/global it defines. Do **not** use `import` / `require` in your own code.
3. Validate, preview, and publish as usual (via the Interfaces editor, or `label-studio-sdk interface validate/preview/sync`). The library ships with the published Interface.

**What works well this way**

- Pure-computation and rendering libraries: date/number utilities, validation (e.g. `zod`), charting/geometry, and in-browser renderers.
- Standard browser rendering APIs — **Canvas and WebGL are available in the sandbox**, so libraries like `three.js` can render inside an Interface. (The *iframe capabilities* list governs device features such as camera and microphone, not 2D/3D rendering.)

**Constraints to keep in mind**

- **Use an IIFE / global build.** `import` / `export` statements aren't supported, and a build that relies on top-level `module.exports` or `require(...)` may not pass validation. You also can't `require()` an npm package at label time — bundle the dependency into the file rather than requiring it, and reference the variable/global it defines.
- The library must run **in-browser within the sandbox**: no Node.js APIs, no access to the parent page's `window`/`document`, no persistent `localStorage`/`sessionStorage`, and any network the library itself performs is still governed by **API origins** (Path 1).
- The bundled code becomes part of the Interface's stored body. There's no fixed size limit, but very large bundles add to load and parse time — keep an eye on it.

---

## Worked example: rendering large point clouds

Suppose you need to review LiDAR point clouds and expect to use `three.js` to render them.

- **Air-gapped / strict security:** **bundle `three.js` locally** (Path 3). Nothing is allow-listed; the renderer ships inside the Interface. If the point-cloud data is fetched from a service, add that data host under **API origins** (Path 1).
- **CDN acceptable:** allow-list the CDN under **Advanced: external scripts** (Path 2) and load `three.js` from there.

Point-cloud **rendering** works because WebGL is available in the sandbox. The real limit is **data size and performance** — very large clouds stress browser/WebGL memory regardless of how the library is packaged, so test with representative data and down-sample or tile if needed.

!!! info
    A heavy third-party renderer already ships inside a stock Interface today: the **Document AI** template renders PDFs with **PDF.js** from its bundled code — a concrete precedent that large libraries run inside Interfaces, including ones that compile internally or offload work to a web worker.

---

## Choosing a path

- **Calling a service over HTTP?** → **API origins** (Path 1).
- **Need a third-party library and OK trusting a CDN?** → **Advanced: external scripts** (Path 2).
- **Need a third-party library with no external dependencies / air-gapped / strict security?** → **Bundle locally** (Path 3). *Preferred default.*

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `fetch()` to my service is blocked | The host isn't in **API origins**, or it's mistakenly listed under **external scripts**. | Add the exact origin under **API origins** (Path 1). |
| My CDN `<script>` won't load, but I added the host to **API origins** | **API origins** governs data requests, not script loading. | Add the host under **Advanced: external scripts** and enable the toggle (Path 2). |
| "Interfaces can't use packages" | Misreading the no-`import` rule as a ban on all third-party code. | You can't `import` npm packages, but you can bundle them in (Path 3) or load them from an allow-listed CDN (Path 2). |
| Bundled library works in the app but fails local validation | The build relies on top-level `module.exports` / `require`. | Use an **IIFE / global** build (e.g. `esbuild --format=iife --global-name=…`) and reference the variable it defines. |
| Library expects Node APIs or the parent `window` | It isn't browser/sandbox-compatible. | Use a browser build; keep any network calls behind **API origins**. |
