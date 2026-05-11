---
title: Interface admin settings
short: Interfaces
tier: enterprise
type: guide
hide_menu: false
order: 0
order_enterprise: 363
meta_title: Interface admin settings
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
date: 2025-02-18 12:03:59
---


The **Organization > Settings > Interfaces** page is where Owners and Admins turn the Interfaces feature on for the organization and configure the security `allowlist` that every Interface runs against.

These settings apply uniformly to every Interface in your organization — embedded iframes, the main labeling canvas, the in-product preview, and the Develop Locally playground.

Access these settings from  **Organization > Settings > Interfaces**.


## Enable Interfaces

Toggle **Allow projects in this organization to use Interfaces** to make the Interfaces feature available across the organization. 

## API origins

Hosts that Interfaces are allowed to reach via `fetch`, `XHR`, or `WebSocket` (the CSP `connect-src` directive). 

| Rule | Detail |
| --- | --- |
| Format | Full origin including scheme, for example `https://api.example.com`. |
| Wildcards | Not allowed (no `*` or `*.example.com`). List specific hosts. |
| Empty | An empty list means **no outbound network from Interfaces** — they can only call your Label Studio server. |
| Whitespace and commas | Rejected. Add one host per entry. |

!!! info Tip
    Your Label Studio server's own origin is always allowed automatically — you don't need to add it. Only list third-party hosts.

## Iframe capabilities

Capabilities that Interfaces are allowed to request through the iframe `allow=` attribute. Click any chip to toggle it on or off. The list is intentionally narrow:

| Capability | Typical use |
| --- | --- |
| `autoplay` | Playing audio or video without user interaction. |
| `camera` | Reading from the device camera. |
| `clipboard-write` | Programmatically copying to the clipboard. |
| `encrypted-media` | Playing DRM-protected media. |
| `fullscreen` | Entering fullscreen mode. |
| `geolocation` | Reading the user's location. |
| `idle-detection` | Detecting when the user is idle. |
| `language-detector` | Using the on-device language detection API. |
| `microphone` | Reading from the device microphone. |
| `on-device-speech-recognition` | Running speech recognition locally. |
| `storage-access` | Requesting unpartitioned storage access. |

!!! warning
    Stay minimal. Every enabled capability is something an Interface (including a third-party or experimental one) could call into. Only enable a capability when an Interface in your organization needs it.

## Advanced: external scripts

Use this section to allow Interfaces to load third-party `<script>` and `<style>` tags from a list of trusted hosts.

Enable **Allow external scripts / stylesheets** to unlock the origin list and then add one or more script origins, for example `https://cdn.jsdelivr.net`.

| Rule | Detail |
| --- | --- |
| Scheme | Must be `https://`. HTTP origins are rejected. |
| Format | Origin only — no paths, query strings, credentials, or fragments. |
| Wildcards | Not allowed. |
| Toggle | Origins are ignored unless the **Allow external scripts** checkbox is on. Turning the checkbox off clears the list on save. |

!!! warning
    Scripts loaded from these origins run with the Interface's full privileges and can read any task data the Interface is rendering. Only add hosts you trust completely. Most organizations should leave this section disabled.




