import { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { Button, IconCheck, IconCopy } from "@humansignal/ui";
import { useCopyText } from "@humansignal/core/lib/hooks/useCopyText";
import { ProjectContext } from "../../../providers/ProjectProvider";

const DATA_VALUE_BY_TYPE = {
  text: "Example task text",
  hypertext: "<p>Example HTML content</p>",
  image: "https://example.com/image.jpg",
  audio: "https://example.com/audio.mp3",
  video: "https://example.com/video.mp4",
  paragraphs: [{ author: "A", text: "Example message" }],
  timeseries: "https://example.com/data.csv",
  table: { col1: "value1", col2: "value2" },
};

function buildValue(type, firstLabel) {
  switch (type) {
    case "choices":
      return { choices: [firstLabel] };
    case "rating":
      return { rating: 5 };
    case "textarea":
      return { text: ["Example generated text"] };
    case "number":
      return { number: 42 };
    case "labels":
      return { start: 0, end: 10, text: "example", labels: [firstLabel] };
    case "rectanglelabels":
      return { x: 10, y: 10, width: 20, height: 20, rotation: 0, rectanglelabels: [firstLabel] };
    case "polygonlabels":
      return {
        points: [
          [10, 10],
          [20, 20],
          [30, 10],
        ],
        polygonlabels: [firstLabel],
      };
    case "keypointlabels":
      return { x: 10, y: 10, keypointlabels: [firstLabel] };
    case "brushlabels":
      return { format: "rle", rle: [0], brushlabels: [firstLabel] };
    default:
      return { [type]: [firstLabel] };
  }
}

// ---------- Legacy path: XML label_config → parsed_label_config ----------

function buildLegacyData(parsed) {
  const data = {};
  Object.values(parsed || {}).forEach((meta) => {
    (meta.inputs || []).forEach((input) => {
      if (!input.value || data[input.value] !== undefined) return;
      const type = (input.type || "").toLowerCase();
      data[input.value] = DATA_VALUE_BY_TYPE[type] ?? "Example value";
    });
  });
  return Object.keys(data).length > 0 ? data : { text: "Example task text" };
}

function buildLegacyResult(parsed) {
  const entries = Object.entries(parsed || {});
  if (entries.length === 0) return null;
  return entries.map(([from_name, meta]) => {
    const type = (meta.type || "").toLowerCase();
    const to_name = Array.isArray(meta.to_name) ? meta.to_name[0] : meta.to_name || "";
    const firstLabel = Array.isArray(meta.labels) && meta.labels.length > 0 ? meta.labels[0] : "Example";
    return { from_name, to_name, type, value: buildValue(type, firstLabel) };
  });
}

// ---------- New path: custom interface → input_schema / output_schema ----------

function normalizeSchemaType(fieldDef) {
  let t = fieldDef?.type || "string";
  if (Array.isArray(t)) t = t.filter((x) => x !== "null")[0] || "string";
  return t;
}

function schemaFieldToResultType(fieldDef) {
  const t = normalizeSchemaType(fieldDef);
  if (t === "string" && Array.isArray(fieldDef.enum)) return "choices";
  if (t === "string") return "textarea";
  if (t === "integer" || t === "number") return "number";
  if (t === "boolean") return "choices";
  if (t === "array") {
    const items = fieldDef.items || {};
    if (Array.isArray(items.enum)) return "choices";
    return "labels";
  }
  return "textarea";
}

function schemaFieldEnum(fieldDef) {
  const t = normalizeSchemaType(fieldDef);
  if (t === "boolean") return ["True", "False"];
  if (t === "array" && Array.isArray(fieldDef.items?.enum)) return fieldDef.items.enum;
  return Array.isArray(fieldDef.enum) ? fieldDef.enum : undefined;
}

function buildInterfaceResult(outputSchema) {
  const properties = outputSchema?.properties || {};
  const entries = Object.entries(properties);
  if (entries.length === 0) return null;
  return entries.map(([key, def]) => {
    const type = schemaFieldToResultType(def);
    const enumValues = schemaFieldEnum(def);
    const firstLabel = Array.isArray(enumValues) && enumValues.length > 0 ? enumValues[0] : "Example";
    return { from_name: key, to_name: "data", type, value: buildValue(type, firstLabel) };
  });
}

function buildInterfaceData(inputSchema, dataSample) {
  const properties = inputSchema?.properties || {};
  const data = {};
  Object.entries(properties).forEach(([key, def]) => {
    const fieldName = def?.default || key;
    if (dataSample && dataSample[fieldName] !== undefined) {
      data[fieldName] = dataSample[fieldName];
    } else {
      data[fieldName] = "Example value";
    }
  });
  if (Object.keys(data).length === 0) {
    if (dataSample && typeof dataSample === "object") return dataSample;
    return { text: "Example task text" };
  }
  return data;
}

// ---------- Python formatting ----------

function toPythonLiteral(value, baseIndent) {
  const json = JSON.stringify(value, null, 4);
  const pyBody = json
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");
  const prefix = " ".repeat(baseIndent);
  return pyBody
    .split("\n")
    .map((line, i) => (i === 0 ? line : prefix + line))
    .join("\n");
}

const CODE_TABS = [
  { key: "json", label: "JSON Import" },
  { key: "python", label: "Python SDK" },
];

const FALLBACK_RESULT = [{ from_name: "label", to_name: "text", type: "choices", value: { choices: ["Positive"] } }];
const FALLBACK_DATA = { text: "Example task text" };

export const ImportPredictionsExample = () => {
  const { project } = useContext(ProjectContext);
  const [tab, setTab] = useState("json");
  const [copyCode, isCopied] = useCopyText();
  const [interfaceSchema, setInterfaceSchema] = useState(null);

  const usesCustomInterface = !!project?.use_custom_interface && !!project?.source_interface_id;

  useEffect(() => {
    if (!usesCustomInterface) {
      setInterfaceSchema(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/interfaces/${project.source_interface_id}/`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setInterfaceSchema(data);
      })
      .catch(() => {
        if (!cancelled) setInterfaceSchema(null);
      });
    return () => {
      cancelled = true;
    };
  }, [usesCustomInterface, project?.source_interface_id]);

  const { jsonSnippet, pythonSnippet, ready } = useMemo(() => {
    const projectId = project?.id ?? "PROJECT_ID";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-labelstudio-instance.com";

    let data = null;
    let result = null;
    let ready = true;

    if (usesCustomInterface) {
      if (!interfaceSchema) {
        ready = false;
      } else {
        data = buildInterfaceData(interfaceSchema.input_schema, interfaceSchema.data_sample);
        result = buildInterfaceResult(interfaceSchema.output_schema);
      }
    } else {
      const parsed = project?.parsed_label_config ?? {};
      result = buildLegacyResult(parsed);
      data = buildLegacyData(parsed);
    }

    if (!result || result.length === 0) {
      result = FALLBACK_RESULT;
    }
    if (!data) {
      data = FALLBACK_DATA;
    }

    const jsonSnippet = JSON.stringify(
      [{ data, predictions: [{ model_version: "my_model_v1", score: 0.95, result }] }],
      null,
      2,
    );

    const resultPy = toPythonLiteral(result, 4);

    const pythonSnippet = `# pip install label-studio-sdk
from label_studio_sdk.client import LabelStudio

ls = LabelStudio(
    base_url="${origin}",
    api_key="YOUR_API_KEY",
)

# Browse tasks: ls.tasks.list(project=${projectId})
ls.predictions.create(
    task=TASK_ID,
    project=${projectId},
    model_version="my_model_v1",
    score=0.95,
    result=${resultPy},
)`;

    return { jsonSnippet, pythonSnippet, ready };
  }, [project, interfaceSchema, usesCustomInterface]);

  const currentCode = tab === "json" ? jsonSnippet : pythonSnippet;
  const displayCode = ready ? currentCode : "Loading project-specific example...";

  return (
    <Card className="!w-full mt-wider">
      <CardHeader>
        <div className="flex flex-col gap-tight">
          <CardTitle>Import predictions</CardTitle>
          <CardDescription>
            Copy this project-specific example to import predictions. The result structure is pre-filled from this
            project's {usesCustomInterface ? "interface schema" : "labeling config"} — replace <code>YOUR_API_KEY</code>{" "}
            with a personal access token, and (for the SDK) <code>TASK_ID</code> with the ID of a task in this project.{" "}
            To learn more,{" "}
            <a
              href="https://labelstud.io/guide/predictions.html"
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              see the documentation
            </a>
            .
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
          {CODE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? "#1e293b" : "#6b7280",
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <pre
            style={{
              fontSize: 12,
              background: "#1e1e2e",
              color: "#cdd6f4",
              padding: 16,
              paddingRight: 56,
              borderRadius: "0 0 6px 6px",
              overflow: "auto",
              margin: 0,
              maxHeight: 420,
              whiteSpace: "pre",
            }}
          >
            {displayCode}
          </pre>
          {ready && (
            <Button
              size="small"
              look="string"
              onClick={() => copyCode(currentCode)}
              style={{ position: "absolute", top: 8, right: 8, color: "#cdd6f4" }}
              aria-label="Copy code"
            >
              {isCopied ? <IconCheck /> : <IconCopy />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
