import { type FC, useMemo, useState } from "react";
import { Button } from "@humansignal/ui";
import { Controlled as CodeMirrorControlled } from "react-codemirror2";
import type CodeMirror from "codemirror";

import "codemirror/mode/markdown/markdown";
import "codemirror/addon/display/placeholder";
import "codemirror/lib/codemirror.css";

import { Markdown } from "../Markdown/Markdown";
import styles from "./MarkdownEditor.module.scss";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
}

type ViewMode = "edit" | "split";

export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter markdown text...",
  readOnly = false,
  rows = 10,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("edit");

  const { charCount, wordCount } = useMemo(() => {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = [...segmenter.segment(value)];
    const charCount = segments.length;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    return { charCount, wordCount };
  }, [value]);

  const minHeight = Math.max(3, rows) * 20;

  const handleEditorChange = (_editor: unknown, _data: unknown, newValue: string) => {
    onChange(newValue);
  };

  const isSplitMode = viewMode === "split";

  // Helper: wrap selection with markdown syntax
  const wrapSelection = (cm: CodeMirror.Editor, prefix: string, suffix = prefix) => {
    const selection = cm.getSelection();
    const doc = cm.getDoc();
    if (selection) {
      cm.replaceSelection(`${prefix}${selection}${suffix}`);
    } else {
      const cursor = doc.getCursor();
      doc.replaceRange(`${prefix}${suffix}`, cursor);
      doc.setCursor({ line: cursor.line, ch: cursor.ch + prefix.length });
    }
    cm.focus();
  };

  // Helper: insert link
  const insertLink = (cm: CodeMirror.Editor) => {
    const linkText = cm.getSelection() || "text";
    cm.replaceSelection(`[${linkText}](url)`);
    const cursor = cm.getCursor();
    cm.setSelection({ line: cursor.line, ch: cursor.ch - 4 }, { line: cursor.line, ch: cursor.ch - 1 });
    cm.focus();
  };

  // Helper: toggle comment
  const toggleComment = (cm: CodeMirror.Editor) => {
    const selection = cm.getSelection();
    if (selection) {
      const isCommented = selection.startsWith("<!-- ") && selection.endsWith(" -->");
      cm.replaceSelection(isCommented ? selection.slice(5, -4) : `<!-- ${selection} -->`);
    } else {
      const doc = cm.getDoc();
      const cursor = doc.getCursor();
      const line = doc.getLine(cursor.line);
      const trimmed = line.trim();
      const isCommented = trimmed.startsWith("<!-- ") && trimmed.endsWith(" -->");
      const indent = line.match(/^\s*/)?.[0] || "";
      const newLine = isCommented
        ? line.replace(/^\s*<!--\s/, "").replace(/\s-->$/, "")
        : `${indent}<!-- ${trimmed} -->`;
      doc.replaceRange(newLine, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    }
    cm.focus();
  };

  // Build CodeMirror options with keyboard shortcuts
  const codeMirrorOptions = {
    mode: "markdown" as const,
    theme: "default" as const,
    lineNumbers: true,
    lineWrapping: true,
    readOnly,
    placeholder,
    extraKeys: {
      ...(onSubmit
        ? {
            "Shift-Enter": (cm: CodeMirror.Editor) => {
              const trimmedValue = cm.getValue().replace(/\n$/, "");
              if (trimmedValue) {
                onChange(trimmedValue);
                onSubmit();
              }
            },
          }
        : {}),
      "Ctrl-B": (cm: CodeMirror.Editor) => wrapSelection(cm, "**"),
      "Cmd-B": (cm: CodeMirror.Editor) => wrapSelection(cm, "**"),
      "Ctrl-I": (cm: CodeMirror.Editor) => wrapSelection(cm, "*"),
      "Cmd-I": (cm: CodeMirror.Editor) => wrapSelection(cm, "*"),
      "Ctrl-`": (cm: CodeMirror.Editor) => wrapSelection(cm, "`"),
      "Cmd-`": (cm: CodeMirror.Editor) => wrapSelection(cm, "`"),
      "Ctrl-K": insertLink,
      "Cmd-K": insertLink,
      "Ctrl-/": toggleComment,
      "Cmd-/": toggleComment,
    },
  };

  return (
    <div className={styles.markdownEditor} style={{ ["--markdown-editor-min-height" as any]: `${minHeight}px` }}>
      <div className={styles.markdownEditor__tabs}>
        <Button
          type="button"
          variant="neutral"
          look="outlined"
          size="small"
          onClick={() => setViewMode(isSplitMode ? "edit" : "split")}
          className={styles.markdownEditor__viewToggle}
          title={isSplitMode ? "Edit only" : "Split view"}
        >
          {isSplitMode ? "Edit" : "Split"}
        </Button>

        <div className={styles.markdownEditor__stats}>
          <span className={styles.markdownEditor__stat}>
            {charCount} {charCount === 1 ? "character" : "characters"}
          </span>
          <span className={styles.markdownEditor__statSeparator}>•</span>
          <span className={styles.markdownEditor__stat}>
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      </div>

      <div className={`${styles.markdownEditor__content} ${isSplitMode ? styles.markdownEditor__content_split : ""}`}>
        {isSplitMode ? (
          <>
            <div className={styles.markdownEditor__editor}>
              <CodeMirrorControlled value={value} options={codeMirrorOptions} onBeforeChange={handleEditorChange} />
            </div>
            <div className={styles.markdownEditor__preview}>
              {value.trim() ? (
                <Markdown text={value} allowHtml={false} />
              ) : (
                <div className={styles.markdownEditor__previewEmpty}>
                  Nothing to preview. Start typing in the editor.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.markdownEditor__editor}>
            <CodeMirrorControlled value={value} options={codeMirrorOptions} onBeforeChange={handleEditorChange} />
          </div>
        )}
      </div>
    </div>
  );
};