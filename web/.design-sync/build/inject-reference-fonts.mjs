// Injects the fonts design-sync ships via cfg.extraFonts (IBM Plex Mono) + build/host-vars.css into the reference storybook
// (.design-sync/sb-reference/iframe.html), so the compare oracle renders the same face the uploaded bundle does.
// Re-run after every `storybook build` into .design-sync/sb-reference (the build overwrites iframe.html).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "../..");
const sbRef = path.join(webRoot, ".design-sync/sb-reference");
const fontDir = path.join(webRoot, ".design-sync/fonts/ibm-plex-mono");
const iframe = path.join(sbRef, "iframe.html");
if (!existsSync(iframe)) throw new Error(`no ${iframe} — build the reference storybook first`);

const outDir = path.join(sbRef, "ds-fonts");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(fontDir).filter((f) => f.endsWith(".woff2")))
  copyFileSync(path.join(fontDir, f), path.join(outDir, f));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const css =
  stripComments(readFileSync(path.join(fontDir, "ibm-plex-mono.css"), "utf8")).replaceAll(
    'url("./',
    'url("./ds-fonts/',
  ) + stripComments(readFileSync(path.join(here, "host-vars.css"), "utf8"));

const BEGIN = "<!-- design-sync:extra-fonts -->";
const END = "<!-- /design-sync:extra-fonts -->";
let html = readFileSync(iframe, "utf8");
const block = `${BEGIN}<style>${css.trim()}</style>${END}`;
html = html.includes(BEGIN)
  ? html.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), block)
  : html.replace("</head>", `${block}\n</head>`);
writeFileSync(iframe, html);
console.error("injected IBM Plex Mono + host vars into .design-sync/sb-reference/iframe.html");
