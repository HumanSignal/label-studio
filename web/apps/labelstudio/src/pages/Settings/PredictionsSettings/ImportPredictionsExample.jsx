import { useContext, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { Button } from "@humansignal/ui";
import { IconCheck, IconCopy } from "@humansignal/icons";
import { useCopyText } from "@humansignal/core/lib/hooks/useCopyText";
import { ProjectContext } from "../../../providers/ProjectProvider";

// Example data values shown inside the generated code snippets; the
// human-readable sample strings are localized via i18next.
function dataValueByType(tr) {
  return {
    text: tr("settings:exampleTaskText"),
    hypertext: `<p>${tr("settings:exampleHtmlContent")}</p>`,
    image: "https://example.com/image.jpg",
    audio: "https://example.com/audio.mp3",
    video: "https://example.com/video.mp4",
    paragraphs: [{ author: "A", text: tr("settings:exampleMessage") }],
    timeseries: "https://example.com/data.csv",
    table: { col1: "value1", col2: "value2" },
  };
}

function buildValue(type, firstLabel, tr) {
  switch (type) {
    case "choices":
      return { choices: [firstLabel] };
    case "rating":
      return { rating: 5 };
    case "textarea":
      return { text: [tr("settings:exampleGeneratedText")] };
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

function buildLegacyData(parsed, tr) {
  const valuesByType = dataValueByType(tr);
  const data = {};
  Object.values(parsed || {}).forEach((meta) => {
    (meta.inputs || []).forEach((input) => {
      if (!input.value || data[input.value] !== undefined) return;
      const type = (input.type || "").toLowerCase();
      data[input.value] = valuesByType[type] ?? tr("settings:exampleValue");
    });
  });
  return Object.keys(data).length > 0 ? data : { text: tr("settings:exampleTaskText") };
}

function buildLegacyResult(parsed, tr) {
  const entries = Object.entries(parsed || {});
  if (entries.length === 0) return null;
  return entries.map(([from_name, meta]) => {
    const type = (meta.type || "").toLowerCase();
    const to_name = Array.isArray(meta.to_name) ? meta.to_name[0] : meta.to_name || "";
    const firstLabel =
      Array.isArray(meta.labels) && meta.labels.length > 0 ? meta.labels[0] : tr("settings:exampleLabel");
    return { from_name, to_name, type, value: buildValue(type, firstLabel, tr) };
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

function buildInterfaceResult(outputSchema, tr) {
  const properties = outputSchema?.properties || {};
  const entries = Object.entries(properties);
  if (entries.length === 0) return null;
  return entries.map(([key, def]) => {
    const type = schemaFieldToResultType(def);
    const enumValues = schemaFieldEnum(def);
    const firstLabel = Array.isArray(enumValues) && enumValues.length > 0 ? enumValues[0] : tr("settings:exampleLabel");
    return { from_name: key, to_name: "data", type, value: buildValue(type, firstLabel, tr) };
  });
}

function buildInterfaceData(inputSchema, dataSample, tr) {
  const properties = inputSchema?.properties || {};
  const data = {};
  Object.entries(properties).forEach(([key, def]) => {
    const fieldName = def?.default || key;
    if (dataSample && dataSample[fieldName] !== undefined) {
      data[fieldName] = dataSample[fieldName];
    } else {
      data[fieldName] = tr("settings:exampleValue");
    }
  });
  if (Object.keys(data).length === 0) {
    if (dataSample && typeof dataSample === "object") return dataSample;
    return { text: tr("settings:exampleTaskText") };
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
  { key: "json", labelKey: "settings:tabJsonImport" },
  { key: "python", labelKey: "settings:tabPythonSdk" },
];

export const ImportPredictionsExample = () => {
  const { project } = useContext(ProjectContext);
  const { t } = useTranslation();
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
        data = buildInterfaceData(interfaceSchema.input_schema, interfaceSchema.data_sample, t);
        result = buildInterfaceResult(interfaceSchema.output_schema, t);
      }
    } else {
      const parsed = project?.parsed_label_config ?? {};
      result = buildLegacyResult(parsed, t);
      data = buildLegacyData(parsed, t);
    }

    if (!result || result.length === 0) {
      result = [
        {
          from_name: "label",
          to_name: "text",
          type: "choices",
          value: { choices: [t("settings:examplePositiveLabel")] },
        },
      ];
    }
    if (!data) {
      data = { text: t("settings:exampleTaskText") };
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
  }, [project, interfaceSchema, usesCustomInterface, t]);

  const currentCode = tab === "json" ? jsonSnippet : pythonSnippet;
  const displayCode = ready ? currentCode : t("settings:loadingExample");

  return (
    <Card className="!w-full mt-wider">
      <CardHeader>
        <div className="flex flex-col gap-tight">
          <CardTitle>{t("settings:importPredictionsTitle")}</CardTitle>
          <CardDescription>
            <Trans
              i18nKey="settings:importPredictionsDescription"
              values={{
                schemaTerm: usesCustomInterface ? t("settings:interfaceSchemaTerm") : t("settings:labelingConfigTerm"),
              }}
              components={{
                code: <code />,
                docsLink: (
                  // biome-ignore lint/a11y/useAnchorContent: Link text is provided by the translation string
                  <a
                    href="https://labelstud.io/guide/predictions.html"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  />
                ),
              }}
            />
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
          {CODE_TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? "#1e293b" : "#6b7280",
                background: "none",
                border: "none",
                borderBottom: tab === key ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t(labelKey)}
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
              aria-label={t("settings:copyCodeAria")}
            >
              {isCopied ? <IconCheck /> : <IconCopy />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
