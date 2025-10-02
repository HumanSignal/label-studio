import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import ReactMarkdown from "react-markdown";

import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import VisibilityMixin from "../../mixins/Visibility";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import { guidGenerator } from "../../utils/unique";

/**
 * The `Markdown` element is used to display markdown-formatted text content.
 * @example
 * <!-- Display markdown from task data -->
 * <View>
 *   <Markdown value="$markdown_text"/>
 * </View>
 * @example
 * <!-- Display static markdown content -->
 * <View>
 *   <Markdown value="## Instructions&#10;&#10;Please **carefully** read the following text and mark all entities."/>
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
const Model = types.model({
  id: types.optional(types.identifier, guidGenerator),
  type: "markdown",
  value: types.optional(types.string, ""),
  _value: types.optional(types.string, ""),
  classname: types.optional(types.string, ""),
  style: types.maybeNull(types.string),
  idattr: types.optional(types.string, ""),
});

const MarkdownModel = types.compose("MarkdownModel", Model, ProcessAttrsMixin, VisibilityMixin, AnnotationMixin);

const HtxMarkdown = observer(({ item }) => {
  const style = item.style ? Tree.cssConverter(item.style) : {};
  
  if (item.isVisible === false) {
    style.display = "none";
  }

  return (
    <div id={item.idattr} className={item.classname} style={style}>
      <ReactMarkdown>{item._value || ""}</ReactMarkdown>
    </div>
  );
});

Registry.addTag("markdown", MarkdownModel, HtxMarkdown);

export { HtxMarkdown, MarkdownModel };
