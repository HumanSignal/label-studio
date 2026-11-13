import sanitizeHTML from "sanitize-html";

/**
 * Default allowlist of iframe domains permitted by the HTML sanitizer.
 *
 * Used as a fallback when `window.APP_SETTINGS.allowed_iframe_domains` is not
 * provided (e.g. standalone editor, unit tests, SSR). In production the value
 * is rendered into the page by Django via `settings.ALLOWED_IFRAME_DOMAINS`,
 * configurable through the `LABEL_STUDIO_ALLOWED_IFRAME_DOMAINS` env var.
 *
 * Keep this list in sync with `ALLOWED_IFRAME_DOMAINS` in
 * `services/lso/label_studio/core/settings/base.py`.
 *
 * @type {string[]}
 */
const DEFAULT_ALLOWED_IFRAME_DOMAINS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "youtu.be",
  "www.canva.com",
  "canva.com",
];

function getAllowedIframeDomains() {
  const fromSettings =
    (typeof window !== "undefined" && window.APP_SETTINGS && window.APP_SETTINGS.allowed_iframe_domains) || null;
  if (Array.isArray(fromSettings) && fromSettings.length > 0) return fromSettings;
  return DEFAULT_ALLOWED_IFRAME_DOMAINS;
}

function parseHttpsUrl(src) {
  if (!src) return null;

  try {
    const url = new URL(src);
    // Only allow HTTPS for security
    return url.protocol === "https:" ? url : null;
  } catch (_e) {
    return null;
  }
}

function isHttpsUrl(src) {
  return parseHttpsUrl(src) !== null;
}

function isAllowedIframeSrc(src, allowedDomains) {
  const url = parseHttpsUrl(src);
  return url !== null && allowedDomains.includes(url.hostname);
}

const ALLOWED_TAGS = [
  // document
  "html",
  "head",
  "body",
  "title",
  "style",
  // sections and blocks
  "address",
  "article",
  "aside",
  "footer",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hgroup",
  "main",
  "nav",
  "section",
  "blockquote",
  "center",
  "dd",
  "details",
  "dir",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "hr",
  "li",
  "menu",
  "ol",
  "p",
  "pre",
  "summary",
  "ul",
  // text-level
  "a",
  "abbr",
  "acronym",
  "b",
  "bdi",
  "bdo",
  "big",
  "br",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "font",
  "i",
  "ins",
  "kbd",
  "mark",
  "nobr",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "time",
  "tt",
  "u",
  "var",
  "wbr",
  // tables
  "caption",
  "col",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  // media
  "area",
  "audio",
  "img",
  "map",
  "picture",
  "source",
  "track",
  "video",
  // display-only form elements
  "fieldset",
  "label",
  "legend",
  "meter",
  "output",
  "progress",
  // gated by isAllowedIframeSrc
  "iframe",
];

const ALLOWED_ATTRIBUTES = {
  "*": [
    "abbr",
    "align",
    "aria-*",
    "bgcolor",
    "border",
    "cellpadding",
    "cellspacing",
    "class",
    "color",
    "colspan",
    "data-*",
    "datetime",
    "dir",
    "face",
    "headers",
    "height",
    "hidden",
    "id",
    "lang",
    "nowrap",
    "role",
    "rowspan",
    "scope",
    "size",
    "span",
    "style",
    "summary",
    "tabindex",
    "title",
    "translate",
    "valign",
    "width",
  ],
  a: ["href", "hreflang", "name", "rel", "target", "type"],
  area: ["alt", "coords", "href", "rel", "shape", "target"],
  audio: ["autoplay", "controls", "loop", "muted", "preload", "src"],
  blockquote: ["cite"],
  body: ["background"],
  del: ["cite"],
  details: ["open"],
  iframe: ["allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy", "sandbox", "scrolling", "src"],
  img: [
    "alt",
    "decoding",
    "hspace",
    "ismap",
    "loading",
    "referrerpolicy",
    "sizes",
    "src",
    "srcset",
    "usemap",
    "vspace",
  ],
  ins: ["cite"],
  label: ["for"],
  li: ["type", "value"],
  map: ["name"],
  meter: ["high", "low", "max", "min", "optimum", "value"],
  ol: ["reversed", "start", "type"],
  output: ["for"],
  progress: ["max", "value"],
  q: ["cite"],
  source: ["media", "sizes", "src", "srcset", "type"],
  table: ["background"],
  td: ["background"],
  th: ["background"],
  time: ["datetime"],
  tr: ["background"],
  track: ["default", "kind", "label", "src", "srclang"],
  ul: ["type"],
  video: ["autoplay", "controls", "loop", "muted", "playsinline", "poster", "preload", "src"],
};

// Content of these tags is dropped instead of unwrapped. sanitize-html emits the content of an
// allowed tag listed here as raw text, so an allowed tag must never be added to this list.
const DROPPED_CONTENT_TAGS = [
  "script",
  "noscript",
  "template",
  "textarea",
  "option",
  "select",
  "datalist",
  "xmp",
  "noembed",
  "noframes",
  "plaintext",
];

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
const URL_ATTRIBUTES = ["background", "cite", "href", "poster", "src"];

// Project instructions of an organization whose owner opted in to unsafe instruction tags (off by default):
// the backend keeps these tags for that organization, so the instructions modal keeps the ones that only load
// content or collect input. <base> and <meta> would retarget or navigate the whole app and scripts never run
// through innerHTML, so they stay out; svg stays out because `style` raw text is only safe without it.
const OPTED_IN_INSTRUCTION_TAGS = ["link", "embed", "object", "form", "input", "button"];
const OPTED_IN_INSTRUCTION_ATTRIBUTES = {
  link: ["href", "media", "rel", "type"],
  embed: ["src", "type"],
  object: ["data", "type"],
  form: ["action", "method"],
  input: ["checked", "disabled", "name", "placeholder", "type", "value"],
  button: ["disabled", "name", "type", "value"],
};

function stripEventHandlers(tagName, attribs) {
  Object.keys(attribs).forEach((attr) => {
    // Browsers treat every on* attribute as an event handler, so a fixed list always misses some
    if (/^on/i.test(attr)) {
      delete attribs[attr];
    }
  });
  return {
    tagName,
    attribs,
  };
}

// The browser parses the content of these elements as raw text, and sanitize-html (htmlparser2) does not always end
// that text where the browser does: `</style/` ends a style element in the browser but not in htmlparser2, and
// iframe content is markup to htmlparser2 but raw text to the browser. Text the sanitizer passes through raw then
// becomes markup in the page. Their content is never shown (style and title are handled separately), so it is
// emptied before sanitizing.
const RAW_TEXT_CONTENT_TO_EMPTY = ["iframe", "noembed", "noframes", "noscript", "plaintext", "textarea", "xmp"];
const FULL_DOCUMENT = /<(html|head|body)[\s>/]/i;

const hasDom = () => typeof DOMParser !== "undefined" && typeof document !== "undefined";

// DOMParser documents and <template> contents are inert: parsing them runs no script and loads nothing
function parseInert(html) {
  if (FULL_DOCUMENT.test(html)) {
    const root = new DOMParser().parseFromString(html, "text/html").documentElement;
    return { root, serialize: () => root.outerHTML };
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  return { root: template.content, serialize: () => template.innerHTML };
}

/**
 * Re-serialize html with the browser's own parser so sanitize-html sees the element structure the browser will
 * build. Without a DOM (SSR, plain node) html is returned unchanged.
 */
function normalizeWithBrowserParser(html) {
  if (!hasDom()) return html;
  const { root, serialize } = parseInert(html);
  root.querySelectorAll(RAW_TEXT_CONTENT_TO_EMPTY.join(",")).forEach((el) => el.replaceChildren());
  return serialize();
}

// Last check, in the browser's own parser: no element outside the allowlist and no event handler survived
function isInertMarkup(html, allowedTags) {
  if (!hasDom()) return true;
  const allowed = new Set(allowedTags);
  return Array.from(parseInert(html).root.querySelectorAll("*")).every(
    (el) => allowed.has(el.localName) && !Array.from(el.attributes).some((attr) => /^on/i.test(attr.name)),
  );
}

function sanitizeWith(html, { allowedTags, allowedAttributes, urlAttributes, isAllowedIframe }) {
  if (!html) return "";

  const sanitized = sanitizeHTML(normalizeWithBrowserParser(String(html)), {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: urlAttributes,
    disallowedTagsMode: "discard",
    // `style` raw text is emitted as is; the browser-parser normalization above makes it end where the browser ends it
    allowVulnerableTags: true,
    nonTextTags: DROPPED_CONTENT_TAGS,
    exclusiveFilter: (frame) => frame.tag === "iframe" && !isAllowedIframe(frame.attribs?.src),
    transformTags: {
      "*": stripEventHandlers,
    },
  });

  if (isInertMarkup(sanitized, allowedTags)) return sanitized;
  // Never hand markup the browser would parse into active content to innerHTML: keep only the text
  return sanitizeHTML(sanitized, { allowedTags: [], allowedAttributes: {}, nonTextTags: DROPPED_CONTENT_TAGS });
}

/**
 * Sanitize html to an allowlist of tags, attributes and URL schemes
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html = []) {
  const allowedDomains = getAllowedIframeDomains();

  return sanitizeWith(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    urlAttributes: URL_ATTRIBUTES,
    isAllowedIframe: (src) => isAllowedIframeSrc(src, allowedDomains),
  });
}

const allowsUnsafeInstructionTags = () =>
  typeof window !== "undefined" && window.APP_SETTINGS?.allow_unsafe_instruction_tags === true;

/**
 * Sanitize project instructions. Same as `sanitizeHtml` unless the organization opted in to unsafe instruction
 * tags (`APP_SETTINGS.allow_unsafe_instruction_tags`), which also keeps stylesheets, embedded documents, forms
 * and iframes from any https host.
 * @param {string} html
 * @returns {string}
 */
function sanitizeInstructionsHtml(html = []) {
  if (!allowsUnsafeInstructionTags()) return sanitizeHtml(html);

  return sanitizeWith(html, {
    allowedTags: [...ALLOWED_TAGS, ...OPTED_IN_INSTRUCTION_TAGS],
    allowedAttributes: { ...ALLOWED_ATTRIBUTES, ...OPTED_IN_INSTRUCTION_ATTRIBUTES },
    urlAttributes: [...URL_ATTRIBUTES, "action", "data"],
    isAllowedIframe: (src) => isHttpsUrl(src),
  });
}

export { DEFAULT_ALLOWED_IFRAME_DOMAINS, sanitizeHtml, sanitizeInstructionsHtml };
