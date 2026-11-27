import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/** Label Studio token colors — class names match cm6-code-editor-theme.ts and legacy CM5 CSS. */
export const labelStudioHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, class: "tok-keyword" },
  { tag: t.definition(t.variableName), class: "tok-definition" },
  { tag: t.function(t.variableName), class: "tok-definition" },
  { tag: t.standard(t.variableName), class: "tok-variableName" },
  { tag: t.variableName, class: "tok-variableName" },
  { tag: t.typeName, class: "tok-typeName" },
  { tag: t.tagName, class: "tok-tag" },
  { tag: t.attributeName, class: "tok-keyword" },
  { tag: t.number, class: "tok-number" },
  { tag: t.string, class: "tok-string" },
  { tag: t.comment, class: "tok-comment" },
  { tag: t.meta, class: "tok-meta" },
  { tag: t.atom, class: "tok-atom" },
  { tag: t.bracket, class: "tok-bracket" },
  { tag: t.squareBracket, class: "tok-bracket" },
  { tag: t.angleBracket, class: "tok-bracket" },
]);

export const labelStudioSyntaxHighlighting = syntaxHighlighting(labelStudioHighlightStyle);
