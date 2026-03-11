/**
 * Ensures @svgr/webpack always receives a UTF-8 string.
 * For workspace SVGs normalizes Buffer to string and falls back to disk when needed.
 */
const fs = require("fs");

function svgSourceLoader(src) {
  const resourcePath = this.resourcePath || "";
  const content = typeof src === "string" ? src : src && src.toString ? src.toString("utf-8") : src ? String(src) : "";
  const useDisk = !content || !content.trim().startsWith("<");

  if (useDisk && resourcePath && fs.existsSync(resourcePath)) {
    const disk = fs.readFileSync(resourcePath, "utf-8");
    if (!disk || !disk.trim().startsWith("<")) {
      throw new Error(`[svg-source-loader] Invalid SVG content in ${resourcePath}`);
    }
    return disk;
  }

  if (!content || !content.trim().startsWith("<")) {
    throw new Error(`[svg-source-loader] Empty or invalid SVG content for ${resourcePath}`);
  }

  return content;
}

module.exports = svgSourceLoader;
