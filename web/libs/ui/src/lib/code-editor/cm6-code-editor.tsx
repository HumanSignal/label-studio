import CodeMirror, { ExternalChange, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import type { IControlledCodeMirror, IUnControlledCodeMirror } from "react-codemirror2";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@humansignal/shad/utils";
import { buildCm5ChangeData, buildCm6Extensions, createCm5EditorShim, type Cm5EditorOptions } from "./cm5-compat-shim";
import { pickCm6WrapperProps } from "./cm6-code-editor-props";
import { isLargeDocument } from "./cm6-large-document";
import styles from "./code-editor.module.css";
import type { CodeEditorProps } from "./legacy-code-editor";

/** Debounce parent sync — matches CM5 uncontrolled feel on large configs. */
const PARENT_SYNC_DEBOUNCE_MS = 300;

type Cm6CodeEditorProps = CodeEditorProps & (IControlledCodeMirror | IUnControlledCodeMirror);

function applyExternalDocumentValue(view: NonNullable<ReactCodeMirrorRef["view"]>, nextValue: string) {
  const current = view.state.doc.toString();
  if (current === nextValue) return;

  view.dispatch({
    changes: { from: 0, to: current.length, insert: nextValue },
    annotations: [ExternalChange.of(true)],
  });
}

export const Cm6CodeEditor = forwardRef<unknown, Cm6CodeEditorProps>((props, ref) => {
  const {
    border = false,
    controlled: _controlled = false,
    autoCloseTags = true,
    value,
    options,
    onBeforeChange,
    onChange,
    onKeyDown,
    ...restProps
  } = props;

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;
  const cm5Options = (options ?? {}) as Cm5EditorOptions;
  const resolvedAutoCloseTags = autoCloseTags ?? cm5Options.autoCloseTags ?? true;

  const initialValue = typeof value === "string" ? value : "";
  // Must always mirror the live document — @uiw defaults missing `value` to "" and wipes the editor.
  const [editorValue, setEditorValue] = useState(initialValue);
  const editorContentRef = useRef(initialValue);
  const lastPropValueRef = useRef(initialValue);
  const lastEmittedValueRef = useRef(initialValue);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const editorShimRef = useRef(createCm5EditorShim(() => editorRef.current?.view));

  const cancelPendingEmit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
  }, []);

  const commitEditorValue = useCallback((nextValue: string) => {
    editorContentRef.current = nextValue;
    setEditorValue((prev) => (prev === nextValue ? prev : nextValue));
  }, []);

  // Sync when parent pushes a value we did not originate (template load, ref.setValue, etc.).
  useEffect(() => {
    const nextValue = typeof value === "string" ? value : "";
    const prevProp = lastPropValueRef.current;
    if (nextValue === prevProp) return;

    // Parent caught up to a value we already emitted/acknowledged.
    if (nextValue === lastEmittedValueRef.current) {
      lastPropValueRef.current = nextValue;
      return;
    }

    const view = editorRef.current?.view;
    const editorContent = view?.state.doc.toString() ?? editorContentRef.current;

    // Editor has unsynced edits (ahead of last debounced parent emit) — never revert.
    if (editorContent !== lastEmittedValueRef.current) {
      if (nextValue === lastEmittedValueRef.current) {
        lastPropValueRef.current = nextValue;
      }
      return;
    }

    if (editorContent === nextValue) {
      lastEmittedValueRef.current = nextValue;
      lastPropValueRef.current = nextValue;
      commitEditorValue(nextValue);
      return;
    }

    const viewReady = Boolean(view);
    if (viewReady) {
      applyExternalDocumentValue(view!, nextValue);
    }

    commitEditorValue(nextValue);
    lastEmittedValueRef.current = nextValue;
    lastPropValueRef.current = nextValue;
  }, [commitEditorValue, value]);

  const [lightweightMode, setLightweightMode] = useState(
    () => isLargeDocument(initialValue.length) && !cm5Options.hintOptions?.schemaInfo,
  );

  // Schema can load after mount (e.g. tags.json fetch); keep lightweight flag in sync.
  useEffect(() => {
    const docLength = typeof value === "string" ? value.length : editorContentRef.current.length;
    const nextLightweight = isLargeDocument(docLength) && !cm5Options.hintOptions?.schemaInfo;
    setLightweightMode((prev) => (prev === nextLightweight ? prev : nextLightweight));
  }, [cm5Options.hintOptions?.schemaInfo, value]);

  // CM5 parity: react-codemirror2 reapplies options.readOnly after async loads; CM6 must too.
  useEffect(() => {
    if (!editorRef.current?.view) return;
    editorShimRef.current.setOption("readOnly", cm5Options.readOnly);
  }, [cm5Options.readOnly]);

  const extensions = useMemo(
    () =>
      buildCm6Extensions(cm5Options, {
        autoCloseTags: resolvedAutoCloseTags,
        lightweight: lightweightMode,
        onKeyDown: onKeyDownRef.current
          ? (editor, event) => {
              onKeyDownRef.current?.(editor as never, event as never);
            }
          : undefined,
      }),
    [
      resolvedAutoCloseTags,
      lightweightMode,
      options?.mode,
      options?.hintOptions,
      options?.lineNumbers,
      options?.lineWrapping,
      options?.readOnly,
      options?.tabSize,
      options?.placeholder,
    ],
  );

  const emitToParent = useCallback(
    (newValue: string) => {
      const view = editorRef.current?.view;
      if (!view) return;

      const current = view.state.doc.toString();
      if (current !== newValue) return;

      lastEmittedValueRef.current = newValue;
      editorContentRef.current = newValue;
      const editor = createCm5EditorShim(() => view);
      const data = buildCm5ChangeData(view, newValue);
      onBeforeChange?.(editor as never, data as never, newValue);
      onChange?.(editor as never, data as never, newValue);
    },
    [onBeforeChange, onChange],
  );

  const acknowledgeValue = useCallback(
    (nextValue: string) => {
      cancelPendingEmit();
      lastEmittedValueRef.current = nextValue;
      lastPropValueRef.current = nextValue;
      commitEditorValue(nextValue);
    },
    [cancelPendingEmit, commitEditorValue],
  );

  const flushToParent = useCallback(() => {
    cancelPendingEmit();
    const view = editorRef.current?.view;
    const current = view?.state.doc.toString() ?? editorContentRef.current;
    if (current !== lastEmittedValueRef.current) {
      emitToParent(current);
    }
    acknowledgeValue(current);
  }, [cancelPendingEmit, emitToParent, acknowledgeValue]);

  const flushToParentRef = useRef(flushToParent);
  flushToParentRef.current = flushToParent;
  const acknowledgeValueRef = useRef(acknowledgeValue);
  acknowledgeValueRef.current = acknowledgeValue;

  useImperativeHandle(
    ref,
    () => ({
      editor: editorShimRef.current,
      flushPendingChanges: () => flushToParentRef.current(),
      acknowledgeValue: (nextValue: string) => acknowledgeValueRef.current(nextValue),
    }),
    [],
  );

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    [],
  );

  const handleChange = useCallback(
    (newValue: string) => {
      commitEditorValue(newValue);

      const nextLightweight = isLargeDocument(newValue.length) && !cm5Options.hintOptions?.schemaInfo;
      setLightweightMode((prev) => (prev === nextLightweight ? prev : nextLightweight));

      cancelPendingEmit();
      debounceTimerRef.current = setTimeout(() => {
        const current = editorRef.current?.view?.state.doc.toString() ?? newValue;
        emitToParent(current);
      }, PARENT_SYNC_DEBOUNCE_MS);
    },
    [cancelPendingEmit, cm5Options.hintOptions?.schemaInfo, commitEditorValue, emitToParent],
  );

  const isReadOnly = cm5Options.readOnly === true || cm5Options.readOnly === "nocursor";
  const wrapperProps = pickCm6WrapperProps(restProps as Record<string, unknown>);

  return (
    <div
      className={cn(styles.codeEditor, styles.cm6CodeEditor, {
        [styles.border]: border,
      })}
      data-testid="cm6-code-editor"
      data-large-document={lightweightMode ? "true" : undefined}
      onBlur={flushToParent}
      {...wrapperProps}
    >
      <CodeMirror
        ref={editorRef}
        value={editorValue}
        height="100%"
        theme="none"
        extensions={extensions}
        onChange={handleChange}
        editable={!isReadOnly}
        basicSetup={false}
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          width: "100%",
        }}
      />
    </div>
  );
});

Cm6CodeEditor.displayName = "Cm6CodeEditor";
