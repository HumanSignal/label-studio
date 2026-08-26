/**
 * Generates Task Source Viewer-shaped JSON fixtures at ~10KB, ~100KB, and ~1MB.
 *
 * Usage (from services/lso/web):
 *   bun libs/ui/scripts/generate-json-viewer-fixtures.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../src/lib/json-viewer/__fixtures__");

const TARGETS = [
  { name: "large-task-source-10kb", bytes: 10 * 1024 },
  { name: "large-task-source-100kb", bytes: 100 * 1024 },
  { name: "large-task-source-1mb", bytes: 1024 * 1024 },
];

function makeAnnotation(index) {
  return {
    id: index,
    completed_by: { id: index % 5, email: `annotator${index % 5}@example.com` },
    result: [
      {
        id: `result-${index}`,
        type: "choices",
        value: { choices: [`label_${index % 12}`] },
        from_name: "choice",
        to_name: "text",
      },
    ],
    created_at: "2024-01-15T12:00:00.000Z",
    updated_at: "2024-01-15T12:05:00.000Z",
    lead_time: 42.5 + (index % 10),
  };
}

function buildTaskSource(annotationCount, extraDataKeys = 0) {
  const data = {
    text: "Sample task text for labeling interface preview and data manager inspection.",
    image: "s3://bucket/path/to/image.jpg",
    audio: "s3://bucket/path/to/audio.wav",
  };

  for (let i = 0; i < extraDataKeys; i++) {
    data[`field_${i}`] = `value_${i}_${"x".repeat(24)}`;
  }

  return {
    id: 9001,
    inner_id: 42,
    data,
    meta: { source: "import", batch_id: "batch-001" },
    annotations: Array.from({ length: annotationCount }, (_, i) => makeAnnotation(i + 1)),
    predictions: [],
    drafts: [],
  };
}

function approximateSize(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function generateForTarget(targetBytes) {
  let annotations = Math.max(4, Math.floor(targetBytes / 900));
  let payload = buildTaskSource(annotations);
  let size = approximateSize(payload);

  // Grow annotation count until we reach target (cap iterations for safety)
  for (let i = 0; i < 50 && size < targetBytes * 0.95; i++) {
    annotations = Math.ceil(annotations * 1.35);
    payload = buildTaskSource(annotations);
    size = approximateSize(payload);
  }

  // If still under target, add extra data keys
  let extraKeys = 0;
  while (size < targetBytes * 0.95 && extraKeys < 5000) {
    extraKeys += 10;
    payload = buildTaskSource(annotations, extraKeys);
    size = approximateSize(payload);
  }

  return { payload, size, annotations, extraKeys };
}

await mkdir(FIXTURES_DIR, { recursive: true });

const manifest = [];

for (const target of TARGETS) {
  const { payload, size, annotations, extraKeys } = generateForTarget(target.bytes);
  const filePath = path.join(FIXTURES_DIR, `${target.name}.json`);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  manifest.push({
    file: `${target.name}.json`,
    targetBytes: target.bytes,
    actualBytes: size,
    annotations,
    extraDataKeys: extraKeys,
  });
  console.log(`Wrote ${filePath} (${size} bytes, ${annotations} annotations)`);
}

await writeFile(
  path.join(FIXTURES_DIR, "manifest.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), fixtures: manifest }, null, 2)}\n`,
);
