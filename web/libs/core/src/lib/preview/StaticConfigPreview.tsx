/**
 * StaticConfigPreview - A lightweight preview renderer that bypasses MST
 *
 * This component renders a Label Studio config without the full editor's
 * state management overhead. It's much faster for preview purposes because:
 * - No MobX-State-Tree (MST) model creation
 * - No annotation store, history, undo/redo
 * - Simple React components with direct props
 * - Updates are just React re-renders
 */

import type React from "react";
import { useMemo, memo } from "react";

// Parse value - resolve $field references from task data
function parseValue(value: string, data: Record<string, any>): string {
  if (!value) return "";
  if (!value.startsWith("$")) return value;

  const fieldName = value.slice(1);
  const fieldValue = data?.[fieldName];

  if (fieldValue === undefined) return value;
  if (typeof fieldValue === "string") return fieldValue;
  return JSON.stringify(fieldValue);
}

// Parse XML string to DOM
function parseXML(xmlString: string): Document | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    if (doc.querySelector("parsererror")) return null;
    return doc;
  } catch {
    return null;
  }
}

// Convert style string to React style object
function parseStyle(styleStr: string | null): React.CSSProperties {
  if (!styleStr) return {};
  const style: Record<string, string> = {};
  styleStr.split(";").forEach((item) => {
    const [key, value] = item.split(":").map((s) => s.trim());
    if (key && value) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      style[camelKey] = value;
    }
  });
  return style;
}

// Get attribute with fallback
function getAttr(el: Element, name: string, fallback = ""): string {
  return el.getAttribute(name) ?? fallback;
}

interface RenderContext {
  data: Record<string, any>;
  depth: number;
}

// Render a single XML element
const RenderElement = memo(({ element, context }: { element: Element; context: RenderContext }) => {
  const tagName = element.tagName.toLowerCase();
  const style = parseStyle(element.getAttribute("style"));
  const value = parseValue(getAttr(element, "value"), context.data);

  // Render children
  const children = useMemo(() => {
    const childElements = Array.from(element.children);
    if (childElements.length === 0) return null;
    return childElements.map((child, i) => (
      <RenderElement key={`${child.tagName}-${i}`} element={child} context={{ ...context, depth: context.depth + 1 }} />
    ));
  }, [element, context]);

  // Tag-specific rendering
  switch (tagName) {
    case "view": {
      const className = getAttr(element, "classname");
      return (
        <div style={style} className={className || undefined}>
          {children}
        </div>
      );
    }

    case "header": {
      const size = Number.parseInt(getAttr(element, "size", "4"));
      const Tag = `h${Math.min(Math.max(size, 1), 6)}` as keyof JSX.IntrinsicElements;
      const underline = element.getAttribute("underline") === "true";
      return (
        <Tag style={{ margin: "10px 0", ...style, textDecoration: underline ? "underline" : undefined }}>
          {value || element.textContent}
        </Tag>
      );
    }

    case "text": {
      const name = getAttr(element, "name");
      const displayValue = value || `[${name || "text"}]`;
      return (
        <div style={{ ...style }} className="lsf-text">
          {displayValue}
        </div>
      );
    }

    case "hypertext": {
      const displayValue = value || element.innerHTML;
      return <div style={{ ...style }} className="lsf-hypertext" dangerouslySetInnerHTML={{ __html: displayValue }} />;
    }

    case "image": {
      const src = parseValue(getAttr(element, "value"), context.data);
      const name = getAttr(element, "name");
      return (
        <div style={{ position: "relative", ...style }} className="lsf-static-preview__image">
          {src && !src.startsWith("$") ? (
            <img src={src} alt={name} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
          ) : (
            <div
              style={{
                background: "#f0f0f0",
                padding: "40px",
                textAlign: "center",
                border: "1px dashed #ccc",
              }}
            >
              [Image: {name || src}]
            </div>
          )}
        </div>
      );
    }

    case "audio":
    case "video": {
      const src = parseValue(getAttr(element, "value"), context.data);
      const name = getAttr(element, "name");
      return (
        <div style={{ position: "relative", ...style }} className={`lsf-static-preview__${tagName}`}>
          <div
            style={{
              background: "#f0f0f0",
              padding: "20px",
              textAlign: "center",
              border: "1px dashed #ccc",
            }}
          >
            [{tagName.charAt(0).toUpperCase() + tagName.slice(1)}: {name || src}]
          </div>
        </div>
      );
    }

    case "choices": {
      const name = getAttr(element, "name");
      const layout = getAttr(element, "layout", "vertical");
      const choiceStyle: React.CSSProperties = {
        display: layout === "horizontal" ? "flex" : "block",
        gap: layout === "horizontal" ? "10px" : undefined,
        flexWrap: layout === "horizontal" ? "wrap" : undefined,
        ...style,
      };
      return (
        <div style={choiceStyle} className="lsf-choices">
          {children}
        </div>
      );
    }

    case "choice": {
      const choiceValue = getAttr(element, "value");
      const alias = getAttr(element, "alias");
      return (
        <label style={{ display: "block", margin: "4px 0", ...style }} className="lsf-choice">
          <input type="radio" disabled style={{ marginRight: "8px" }} />
          {alias || choiceValue}
        </label>
      );
    }

    case "labels": {
      const name = getAttr(element, "name");
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", ...style }} className="lsf-labels">
          {children}
        </div>
      );
    }

    case "label": {
      const labelValue = getAttr(element, "value");
      const background = getAttr(element, "background", "#1890ff");
      return (
        <span
          style={{
            background,
            color: "white",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            ...style,
          }}
          className="lsf-label"
        >
          {labelValue}
        </span>
      );
    }

    case "textarea": {
      const name = getAttr(element, "name");
      const placeholder = getAttr(element, "placeholder", `Enter ${name || "text"}...`);
      const rows = Number.parseInt(getAttr(element, "rows", "3"));
      return (
        <textarea
          style={{ width: "100%", ...style }}
          rows={rows}
          placeholder={placeholder}
          disabled
          className="lsf-textarea"
        />
      );
    }

    case "rating": {
      const maxRating = Number.parseInt(getAttr(element, "maxrating", "5"));
      return (
        <div style={{ ...style }} className="lsf-rating">
          {Array.from({ length: maxRating }, (_, i) => (
            <span key={i} style={{ fontSize: "20px", color: "#ccc" }}>
              ★
            </span>
          ))}
        </div>
      );
    }

    case "collapse": {
      const title = getAttr(element, "title", "Collapse");
      return (
        <details style={{ ...style }} className="lsf-collapse">
          <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "8px" }}>{title}</summary>
          {children}
        </details>
      );
    }

    case "filter":
    case "style":
      // These don't render visible content
      return null;

    default:
      // For unknown tags, just render children
      if (children) {
        return <div style={style}>{children}</div>;
      }
      // Show placeholder for unknown tags
      return (
        <div
          style={{
            padding: "8px",
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
            margin: "4px 0",
            fontSize: "12px",
            ...style,
          }}
        >
          [{tagName}]{value && `: ${value}`}
        </div>
      );
  }
});

RenderElement.displayName = "RenderElement";

export interface StaticConfigPreviewProps {
  config: string;
  data?: Record<string, any>;
  className?: string;
}

export const StaticConfigPreview = memo(({ config, data = {}, className }: StaticConfigPreviewProps) => {
  const renderedContent = useMemo(() => {
    if (!config) return null;

    const doc = parseXML(config);
    if (!doc) {
      return <div style={{ color: "red", padding: "10px" }}>Invalid XML configuration</div>;
    }

    const root = doc.documentElement;
    const context: RenderContext = { data, depth: 0 };

    return <RenderElement element={root} context={context} />;
  }, [config, data]);

  return <div className={`lsf-static-preview ${className || ""}`}>{renderedContent}</div>;
});

StaticConfigPreview.displayName = "StaticConfigPreview";

export default StaticConfigPreview;
