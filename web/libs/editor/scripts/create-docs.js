/**
 * This file is used to parse JSDoc for every tag and their regions
 * and generate two artifacts out of it:
 * - snippets for tag docs used by `insertmd` in https://labelstud.io/tags/
 *   generated docs are written to `outputDirArg` (1st arg)
 *   only tag params, region params and example result jsons are included
 * - schema.json — a dictionary for auto-complete in config editor
 *   generated file is written to `schemaJsonPath` (2nd arg or `SCHEMA_JSON_PATH` env var)
 *
 * Special new constructions:
 * - `@regions` to reference a Region tag(s) used by current tag
 *
 * Usage:
 *   node scripts/create-docs.js [path/to/docs/dir] [path/to/schema.json]
 */

const jsdoc2md = require("jsdoc-to-markdown");
const fs = require("fs");
const path = require("path");

const groups = [
  { dir: "object", title: "Objects", order: 301, nested: true },
  { dir: "control", title: "Controls", order: 401, nested: true },
  { dir: "visual", title: "Visual & Experience", order: 501 },
];

// glob pattern to check all possible extensions
const EXT = "{js,jsx,ts,tsx}";

/**
 * Convert jsdoc parser type to simple actual type or list of possible values
 * @param {{ names: string[] }} type type from jsdoc
 * @returns string[] | string
 */
const attrType = ({ names } = {}) => {
  if (!names) return undefined;
  // boolean values are actually string literals "true" or "false" in config
  if (names[0] === "boolean") return ["true", "false"];
  return names.length > 1 ? names : names[0];
};

const args = process.argv.slice(2);
const outputDirArg = args[0] || `${__dirname}/../docs`;
const outputDir = path.resolve(outputDirArg);
const schemaJsonPath = args[1] || process.env.SCHEMA_JSON_PATH;

// schema for CodeMirror autocomplete
const schema = {};

fs.mkdirSync(outputDir, { recursive: true });

/**
 * Generate tag details and schema for CodeMirror autocomplete for one tag
 * @param {Object} t — tag data from jsdoc2md
 * @returns {string} — tag details
 */
function processTemplate(t) {
  // all tags are with this kind and leading capital letter
  if (t.kind !== "member" || !t.name.match(/^[A-Z]/)) return;

  // generate tag details + all attributes
  schema[t.name] = {
    name: t.name,
    description: t.description,
    attrs: Object.fromEntries(
      t.params?.map((p) => [
        p.name,
        {
          name: p.name,
          description: p.description,
          type: attrType(p.type),
          required: !p.optional,
          default: p.defaultvalue,
        },
      ]) ?? [],
    ),
  };

  // we can use comma-separated list of @regions used by tag
  const regions = t.customTags && t.customTags.find((desc) => desc.tag === "regions");
  // sample regions result and description
  let results = "";

  if (regions) {
    for (const region of regions.value.split(/,\s*/)) {
      const files = path.resolve(`${__dirname}/../src/regions/${region}.${EXT}`);

      try {
        const regionsData = jsdoc2md.getTemplateDataSync({ files });
        // region descriptions named after region and defined as separate type:
        // @typedef {Object} AudioRegionResult
        const serializeData = regionsData.find((reg) => reg.name === `${region}Result`);

        if (serializeData) {
          results = jsdoc2md
            .renderSync({ data: [serializeData], "example-lang": "json" })
            .split("\n")
            .slice(5) // remove first 5 lines with header
            .join("\n")
            .replace(/\*\*Example\*\*\s*\n/, "### Example JSON\n");
          results = `### Result parameters\n${results}\n`;
        }
      } catch (err) {
        console.error(err, files);
      }
    }
  }

  // remove all other @params we don't know how to use
  delete t.customTags;

  const str = jsdoc2md
    .renderSync({ data: [t], "example-lang": "html" })
    // remove useless Kind: member
    .replace(/^.*?\*\*Kind\*\*.*?\n/ms, "### Parameters\n")
    .replace(/\*\*Example\*\*\s*\n.*/ms, results)
    // normalize footnotes to be numbers (e.g. `[^FF_LSDV_0000]` => `[^1]`)
    // @todo right now we don't have any footnotes, but code is helpful if we need them later
    .replace(
      /\[\^([^\]]+)\]/g,
      (() => {
        let footnoteLastIndex = 0;
        const footnoteIdToIdxMap = {};

        return (_, footnoteId) => {
          const footnoteIdx = footnoteIdToIdxMap[footnoteId] || ++footnoteLastIndex;

          footnoteIdToIdxMap[footnoteId] = footnoteIdx;
          return `[^${footnoteIdx}]`;
        };
      })(),
    )
    // force adding new lines before footnote definitions
    .replace(/(?<![\r\n])([\r\n])(\[\^[^[]+\]:)/gm, "$1$1$2");

  return str;
}

////////////// PROCESS TAG DETAILS //////////////
for (const { dir, title, nested } of groups) {
  console.log(`## ${title}`);
  const prefix = `${__dirname}/../src/tags/${dir}`;
  const getTemplateDataByGlob = (glob) => jsdoc2md.getTemplateDataSync({ files: path.resolve(prefix + glob) });
  let templateData = getTemplateDataByGlob(`/*.${EXT}`);

  if (nested) {
    templateData = templateData.concat(getTemplateDataByGlob(`/*/*.${EXT}`));
  }
  // we have to reorder tags so they go alphabetically regardless of their dir
  templateData.sort((a, b) => (a.name > b.name ? 1 : -1));
  for (const t of templateData) {
    const name = t.name.toLowerCase();
    const str = processTemplate(t);

    if (!str) continue;
    fs.writeFileSync(path.resolve(outputDir, `${name}.md`), str);
  }
}

////////////// GENERATE SCHEMA //////////////
if (schemaJsonPath) {
  // @todo we can't generate correct children for every tag for some reason
  // so for now we only specify children for the only root tag — View
  schema.View.children = Object.keys(schema).filter((name) => name !== "!top");
  fs.writeFileSync(schemaJsonPath, JSON.stringify(schema, null, 2));
}
