import tags from "@humansignal/core/lib/utils/schema/tags.json";
import type { AttrSpec, ElementSpec } from "@codemirror/lang-xml";

export type SchemaInfoAttr = {
  name: string;
  description?: string;
  type: string | string[];
  required?: boolean;
};

export type SchemaInfoTag = {
  name: string;
  description?: string;
  attrs?: Record<string, SchemaInfoAttr>;
  children?: string[];
};

export type SchemaInfo = Record<string, SchemaInfoTag>;

function formatAttrType(type: string | string[]): string {
  return Array.isArray(type) ? type.join(" | ") : type;
}

function toAttrSpec(attrName: string, attr: SchemaInfoAttr): AttrSpec {
  const label = attr.required ? `${attrName}*` : attrName;

  return {
    name: attrName,
    values: Array.isArray(attr.type) ? attr.type : undefined,
    completion: {
      label,
      apply: attrName,
      type: "property",
      detail: formatAttrType(attr.type),
      info: attr.description,
    },
  };
}

/**
 * Converts Label Studio tags.json schema (CM5 hintOptions.schemaInfo) to @codemirror/lang-xml config.
 */
export function schemaInfoToXmlConfig(schemaInfo: SchemaInfo): {
  elements: ElementSpec[];
  attributes: AttrSpec[];
} {
  const elements: ElementSpec[] = [];

  for (const [key, tag] of Object.entries(schemaInfo)) {
    if (key === "!attrs") continue;

    const attributes = tag.attrs
      ? Object.entries(tag.attrs).map(([attrName, attr]) => toAttrSpec(attrName, attr))
      : undefined;

    elements.push({
      name: tag.name || key,
      top: key === "View",
      children: tag.children,
      attributes,
      completion: {
        type: "type",
        detail: "tag",
        info: tag.description,
      },
    });
  }

  return { elements, attributes: [] };
}

let cachedLabelingTagsXmlConfig: ReturnType<typeof schemaInfoToXmlConfig> | null = null;

/** Cached conversion of tags.json — schema is static for the app session. */
export function getCachedLabelingTagsXmlConfig() {
  if (!cachedLabelingTagsXmlConfig) {
    cachedLabelingTagsXmlConfig = schemaInfoToXmlConfig(tags as SchemaInfo);
  }
  return cachedLabelingTagsXmlConfig;
}

export function isLabelingTagsSchema(schemaInfo?: SchemaInfo): boolean {
  return schemaInfo === (tags as SchemaInfo);
}
