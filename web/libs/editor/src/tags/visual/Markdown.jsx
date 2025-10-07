import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import ReactMarkdown from "react-markdown";

import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import VisibilityMixin from "../../mixins/Visibility";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import { parseValue } from "../../utils/data";
import { guidGenerator } from "../../utils/unique";

// Custom markdown components with Tailwind styling
const markdownComponents = {
  // Headings
  h1: ({ children }) => <h1 className="text-display-small font-bold mb-wide mt-wider">{children}</h1>,
  h2: ({ children }) => <h2 className="text-headline-large font-bold mb-base mt-wide">{children}</h2>,
  h3: ({ children }) => <h3 className="text-headline-medium font-semibold mb-base mt-wide">{children}</h3>,
  h4: ({ children }) => <h4 className="text-headline-small font-semibold mb-tight mt-base">{children}</h4>,
  h5: ({ children }) => <h5 className="text-title-large font-semibold mb-tight mt-base">{children}</h5>,
  h6: ({ children }) => <h6 className="text-title-medium font-semibold mb-tight mt-base">{children}</h6>,

  // Paragraphs
  p: ({ children }) => <p className="text-body-medium mb-base leading-body-medium">{children}</p>,

  // Lists
  ul: ({ children }) => <ul className="list-disc pl-base mb-base space-y-tighter">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-base mb-base space-y-tighter">{children}</ol>,
  li: ({ children }) => <li className="text-body-medium pl-tight ml-base">{children}</li>,

  // Code
  code: ({ inline, children, ...props }) => {
    return inline ? (
      <code
        className="bg-neutral-emphasis text-neutral-content px-tighter py-tightest rounded-smallest font-mono text-body-smaller"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="font-mono text-body-small" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-neutral-surface-inset border border-neutral-border rounded-small p-base mb-base overflow-x-auto">
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary-border pl-base ml-base mb-base italic text-neutral-content-subtle">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ children, href, ...props }) => (
    <a href={href} className="text-primary-content hover:text-primary-content-hover underline" {...props}>
      {children}
    </a>
  ),

  // Horizontal rule
  hr: () => <hr className="border-neutral-border my-wide" />,

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto mb-base">
      <table className="min-w-full border-collapse border border-neutral-border">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-surface">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-neutral-border">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-neutral-border px-base py-tight text-left font-semibold text-body-medium">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-neutral-border px-base py-tight text-body-medium">{children}</td>,

  // Strong and emphasis
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Strikethrough
  del: ({ children }) => <del className="line-through text-neutral-content-subtle">{children}</del>,
};

/**
 * The `Markdown` element is used to display markdown-formatted text content.
 * @example
 * <!-- Display markdown from task data -->
 * <View>
 *   <Markdown value="$markdown_text"/>
 * </View>
 * @example
 * <!-- Display static markdown content; indents mark code blocks, so avoid them -->
 * <View>
 * <Markdown>
 * ## Instructions
 *
 * Please **carefully** read the following text and mark all entities.
 * </Markdown>
 * </View>
 * @example
 * <!-- Display markdown with custom styling -->
 * <View>
 *   <Markdown value="$description" style="background: #f5f5f5; padding: 10px; border-radius: 4px;"/>
 * </View>
 * @name Markdown
 * @meta_title Markdown Tag for Rendering Markdown Text
 * @meta_description Customize Label Studio with the Markdown tag to display formatted markdown text content for machine learning and data science projects.
 * @param {string} value - Markdown text content, either static text or field name in task data (e.g., $markdown_field)
 * @param {string} [style] - CSS style string
 * @param {string} [className] - Class name of the CSS style to apply
 * @param {string} [idAttr] - Unique ID attribute to use in CSS
 * @param {region-selected|choice-selected|no-region-selected|choice-unselected} [visibleWhen] Control visibility of the content
 * @param {string} [whenTagName] Use with `visibleWhen`. Narrow down visibility by tag name
 * @param {string} [whenLabelValue] Use with `visibleWhen="region-selected"`. Narrow down visibility by label value
 * @param {string} [whenChoiceValue] Use with `visibleWhen` and `whenTagName`. Narrow down visibility by choice value
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "markdown",
    value: types.optional(types.string, ""),
    _value: types.optional(types.string, ""),
    classname: types.optional(types.string, ""),
    style: types.maybeNull(types.string),
    idattr: types.optional(types.string, ""),
  })
  .actions((self) => ({
    updateValue(store) {
      const value = parseValue(self.value, store?.task?.dataObj ?? {});

      // cut CDATA
      self._value = value.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
    },
  }));

const MarkdownModel = types.compose("MarkdownModel", ProcessAttrsMixin, VisibilityMixin, AnnotationMixin, Model);

const HtxMarkdown = observer(({ item }) => {
  const style = item.style ? Tree.cssConverter(item.style) : {};

  if (item.isVisible === false) {
    style.display = "none";
  }

  return (
    <div id={item.idattr} className={item.classname} style={style}>
      <ReactMarkdown components={markdownComponents}>{item._value || ""}</ReactMarkdown>
    </div>
  );
});

Registry.addTag("markdown", MarkdownModel, HtxMarkdown);

export { HtxMarkdown, MarkdownModel };
