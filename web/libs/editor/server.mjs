#!/usr/bin/env bun
/**
 * Bun-native static file server for the editor production build (Cypress / CI).
 * Serves files with Bun.file(); implements RFC 7233 byte ranges (206 + Content-Range) and
 * Accept-Ranges so HTML audio/video can report finite duration and seek (required for Chromium).
 *
 * Default root: dist/libs/editor (relative to services/lso/web). Override with STATIC_ROOT.
 *
 * @see https://bun.com/docs/guides/http/server
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_ROOT = path.resolve(__dirname, "../../dist/libs/editor");
const STATIC_ROOT = path.resolve(process.env.STATIC_ROOT || DEFAULT_ROOT);
const PORT = Number(process.env.PORT) || 3000;

function isInsideRoot(root, candidate) {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  if (c === r) return true;
  const prefix = r.endsWith(path.sep) ? r : `${r}${path.sep}`;
  return c.startsWith(prefix);
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

/**
 * Map request path to an absolute file path under STATIC_ROOT.
 * Rejects path traversal. "/" → index.html at root.
 */
function resolveFilePath(pathname) {
  const decoded = decodePathname(pathname);
  if (decoded === null) return null;

  let rel = decoded;
  if (rel.startsWith("/")) rel = rel.slice(1);
  const segments = rel.split("/").filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === ".." || seg === ".") return null;
  }

  if (segments.length === 0) {
    return path.join(STATIC_ROOT, "index.html");
  }

  const candidate = path.join(STATIC_ROOT, ...segments);
  if (!isInsideRoot(STATIC_ROOT, candidate)) return null;

  if (!existsSync(candidate)) return null;

  const st = statSync(candidate);
  if (st.isDirectory()) {
    const index = path.join(candidate, "index.html");
    if (existsSync(index)) return index;
    return null;
  }

  return candidate;
}

function notFound() {
  return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/**
 * MIME fallback when Bun.file().type is empty (extension-based).
 * @param {string} filePath
 */
function contentTypeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Parse a single `bytes=` range (RFC 7233). Returns one inclusive { start, end } or "unsatisfiable".
 * @param {string} rangeHeader
 * @param {number} size
 * @returns {{ start: number, end: number } | "unsatisfiable" | null}
 */
function parseSingleByteRange(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;
  const spec = rangeHeader.slice("bytes=".length).trim();
  const first = spec.split(",")[0].trim();
  const dash = first.indexOf("-");
  if (dash === -1) return null;

  const startStr = first.slice(0, dash);
  const endStr = first.slice(dash + 1);

  let start;
  let end;

  if (startStr === "") {
    const suffixLen = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffixLen) || suffixLen <= 0) return "unsatisfiable";
    start = Math.max(0, size - suffixLen);
    end = size - 1;
  } else {
    start = Number.parseInt(startStr, 10);
    if (!Number.isFinite(start)) return null;
    if (start >= size) return "unsatisfiable";
    if (endStr === "") {
      end = size - 1;
    } else {
      end = Number.parseInt(endStr, 10);
      if (!Number.isFinite(end)) return null;
      end = Math.min(end, size - 1);
    }
    if (start > end) return "unsatisfiable";
  }

  return { start, end };
}

/**
 * @param {import("bun").BunFile} file
 * @param {string} filePath
 * @param {Request} req
 */
function serveFile(file, filePath, req) {
  const size = file.size;
  const type = file.type || contentTypeForPath(filePath);
  const baseHeaders = {
    "Content-Type": type,
    "Content-Length": String(size),
    "Accept-Ranges": "bytes",
  };

  if (req.method === "HEAD") {
    return new Response(null, { headers: baseHeaders });
  }

  const rangeHeader = req.headers.get("range");
  if (rangeHeader && req.method === "GET") {
    const parsed = parseSingleByteRange(rangeHeader, size);
    if (parsed === "unsatisfiable") {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    if (parsed) {
      const { start, end } = parsed;
      const chunk = file.slice(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  return new Response(file, { headers: baseHeaders });
}

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: PORT,
  fetch(req) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(req.url);
    const filePath = resolveFilePath(url.pathname);
    if (!filePath) {
      return notFound();
    }

    const file = Bun.file(filePath);
    return serveFile(file, filePath, req);
  },
});

console.log(`Serving ${STATIC_ROOT} at ${server.url}`);
