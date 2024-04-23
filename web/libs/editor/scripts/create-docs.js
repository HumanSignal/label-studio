const jsdoc2md = require("jsdoc-to-markdown");
const fs = require("fs");
const path = require("path");

const groups = [
  { dir: "object", title: "Objects", order: 301, nested: true },
  { dir: "control", title: "Controls", order: 401, nested: true },
  { dir: "visual", title: "Visual & Experience", order: 501 },
];

const supertags = ["TimeSeries"];

// glob pattern to check all possible extensions
const EXT = "{js,jsx,ts,tsx}";

const currentTagsUrl = "https://api.github.com/repos/heartexlabs/label-studio/contents/docs/source/tags";

// header with tag info and autogenerated order
// don't touch whitespaces
const infoHeader = (name, group, isNew = false, meta = {}) =>
  [
    "---",
    ...[
      `title: ${name}`,
      "type: tags",
      `order: ${groups.find((g) => g.dir === group).order++}`,
      isNew ? "is_new: t" : "",
      meta.title && `meta_title: ${meta.title}`,
      meta.description && `meta_description: ${meta.description}`,
    ].filter(Boolean),
    "---",
    "",
    "",
  ].join("\n");

const args = process.argv.slice(2);
const outputDirArg = args[0] || __dirname + "/../docs";
const outputDir = path.resolve(outputDirArg);

fs.mkdirSync(outputDir, { recursive: true });

// get list of already exsting tags if possible to set `is_new` flag
fetch(currentTagsUrl)
  .then((res) => (res.ok ? res.json() : null))
  .then((list) => list && list.map((file) => file.name.replace(/.md$/, "")))
  .catch(() => null)
  .then((tags) => {
    function processTemplate(t, dir, supertag) {
      // all tags are with this kind and leading capital letter
      if (t.kind !== "member" || !t.name.match(/^[A-Z]/)) return;
      if (!supertag && t.customTags && t.customTags.find((desc) => desc.tag === "subtag")) return;
      const name = t.name.toLowerCase();
      // there are no new tags if we didn't get the list
      const isNew = tags ? !tags.includes(name) : false;
      const meta = t.customTags
        ? Object.fromEntries(
            // convert @meta_* params into key-value hash
            t.customTags
              .filter((tag) => tag.tag.startsWith("meta_"))
              .map((tag) => [tag.tag.substr(5), tag.value]),
          )
        : {};
      const header = supertag ? `## ${t.name}\n\n` : infoHeader(t.name, dir, isNew, meta);

      // we can use comma-separated list of @regions used by tag
      const regions = t.customTags && t.customTags.find((desc) => desc.tag === "regions");
      // sample regions result and description
      let results = "";

      if (regions) {
        for (const region of regions.value.split(/,\s*/)) {
          const files = path.resolve(`${__dirname}/../src/regions/${region}.${EXT}`);
          const regionsData = jsdoc2md.getTemplateDataSync({ files });
          // region descriptions named after region and defined as separate type:
          // @typedef {Object} AudioRegionResult
          const serializeData = regionsData.find((reg) => reg.name === region + "Result");

          if (serializeData) {
            results = jsdoc2md
              .renderSync({ data: [serializeData], "example-lang": "json" })
              .split("\n")
              .slice(5) // remove first 5 lines with header
              .join("\n")
              .replace(/\*\*Example\*\*\s*\n/, "### Example JSON\n");
            results = `### Sample Results JSON\n${results}\n`;
          }
        }
      }

      // remove all other @params we don't know how to use
      delete t.customTags;

      let str = jsdoc2md
        .renderSync({ data: [t], "example-lang": "html" })
        // add header with info instead of header for github
        // don't add any header to subtags as they'll be inserted into supertag's doc
        .replace(/^(.*?\n){3}/, header)
        // remove useless Kind: member
        .replace(/\*\*Kind\*\*.*?\n/, "### Parameters\n")
        .replace(/(\*\*Example\*\*\s*\n)/, results + "$1")
        .replace(/\*\*Example\*\*\s*\n/g, "### Example\n")
        // move comments from examples to description
        .replace(/```html[\n\s]*<!--[\n\s]*([\w\W]*?)[\n\s]*-->[\n\s]*/g, "\n$1\n\n```html\n")
        // change example language if it looks like JSON
        .replace(/```html[\n\s]*([[{])/g, "```json\n$1")
        // normalize footnotes to be numbers (e.g. `[^FF_LSDV_0000]` => `[^1]`)
        .replace(
          /\[\^([^\]]+)\]/g,
          (() => {
            let footnoteLastIndex = 0;
            const footnoteIdToIdxMap = {};

            return (match, footnoteId) => {
              const footnoteIdx = footnoteIdToIdxMap[footnoteId] || ++footnoteLastIndex;

              footnoteIdToIdxMap[footnoteId] = footnoteIdx;
              return `[^${footnoteIdx}]`;
            };
          })(),
        )
        // force adding new lines before footnote definitions
        .replace(/(?<![\r\n])([\r\n])(\[\^[^\[]+\]:)/gm, "$1$1$2");

      if (supertags.includes(t.name)) {
        console.log(`Fetching subtags of ${t.name}`);
        const templates = jsdoc2md.getTemplateDataSync({ files: `${t.meta.path}/${t.name}/*.${EXT}` });
        const subtags = templates
          .map((t) => processTemplate(t, dir, t.name))
          .filter(Boolean)
          .join("\n\n");

        if (subtags) {
          // insert before the first example or just at the end of doc
          str = str.replace(/(### Example)|$/, `${subtags}\n$1`);
        }
      }

      return str;
    }

    for (const { dir, title, nested } of groups) {
      console.log("## " + title);
      const prefix = __dirname + "/../src/tags/" + dir;
      const getTemplateDataByGlob = (glob) => jsdoc2md.getTemplateDataSync({ files: path.resolve(prefix + glob) });
      let templateData = getTemplateDataByGlob(`/*.${EXT}`);

      if (nested) {
        templateData = templateData.concat(getTemplateDataByGlob(`/*/*.${EXT}`));
      }
      // tags inside nested dirs go after others, so we have to resort file list
      templateData.sort((a, b) => (a.name > b.name ? 1 : -1));
      for (const t of templateData) {
        const name = t.name.toLowerCase();
        const str = processTemplate(t, dir);

        if (!str) continue;
        fs.writeFileSync(path.resolve(outputDir, `${name}.md`), str);
      }
    }
  })
  .catch(console.error);
