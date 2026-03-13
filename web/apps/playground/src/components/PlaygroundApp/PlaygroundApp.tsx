import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ToastProvider, ToastViewport } from "@humansignal/ui/lib/toast/toast";
import { cnm } from "@humansignal/shad/utils";
import { PreviewPanel } from "../PreviewPanel";
import { EditorPanel } from "../EditorPanel";
import { TopBar } from "./TopBar";
import { configAtom, loadingAtom, errorAtom, interfacesAtom, displayModeAtom } from "../../atoms/configAtoms";
import {
  getQueryParams,
  replaceBrTagsWithNewlines,
  getInterfacesFromParams,
  throwUnlessXmlLike,
} from "../../utils/query";
import styles from "./PlaygroundApp.module.css";

const DEFAULT_EDITOR_WIDTH_PERCENT = 50;
const MIN_EDITOR_WIDTH_PERCENT = 20;
const MAX_EDITOR_WIDTH_PERCENT = 80;

export const PlaygroundApp = () => {
  const setConfig = useSetAtom(configAtom);
  const setLoading = useSetAtom(loadingAtom);
  const setError = useSetAtom(errorAtom);
  const setInterfaces = useSetAtom(interfacesAtom);
  const displayMode = useAtomValue(displayModeAtom);
  const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH_PERCENT);
  const dragging = useRef(false);

  useEffect(() => {
    const params = getQueryParams();
    const configParam = params.get("config");
    const configUrl = params.get("configUrl");
    setInterfaces(getInterfacesFromParams(params));

    async function loadConfig() {
      let config = null;

      // Precedence: configUrl > configParam
      if (configUrl) {
        setLoading(true);
        try {
          const res = await fetch(configUrl);
          if (!res.ok) throw new Error("Failed to fetch config from URL.");
          const text = await res.text();
          // Replace all <br> tags with newlines
          config = replaceBrTagsWithNewlines(text);
        } catch (e) {
          setError("Failed to fetch config from URL.");
        } finally {
          setLoading(false);
        }
      }

      config ??= configParam;

      if (config) {
        try {
          // Check if the config is already valid xml
          // Otherwise, parse url encoded config
          // Replace all <br> tags with newlines
          try {
            throwUnlessXmlLike(config);
            setConfig(replaceBrTagsWithNewlines(config));
          } catch (e) {
            setConfig(replaceBrTagsWithNewlines(decodeURIComponent(config)));
          }
        } catch (e) {
          setError("Failed to decode config. Are you sure it's a valid urlencoded string?");
        }
        return;
      }
    }
    loadConfig();
    // eslint-disable-next-line
  }, [setConfig, setError, setLoading, setInterfaces]);

  // Draggable divider logic
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const percent = (e.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.max(MIN_EDITOR_WIDTH_PERCENT, Math.min(MAX_EDITOR_WIDTH_PERCENT, percent)));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove as unknown as EventListener);
    window.addEventListener("mouseup", onMouseUp as unknown as EventListener);
    return () => {
      window.removeEventListener("mousemove", onMouseMove as unknown as EventListener);
      window.removeEventListener("mouseup", onMouseUp as unknown as EventListener);
    };
  }, []);

  const handleDividerDoubleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setEditorWidth(DEFAULT_EDITOR_WIDTH_PERCENT);
    },
    [setEditorWidth],
  );

  const previewPanelStyle = useMemo(() => ({ width: `${100 - editorWidth}%` }), [editorWidth]);

  return (
    <div
      className={cnm("flex flex-col h-screen w-screen", {
        [styles.root]: true,
      })}
    >
      <ToastProvider>
        {/* Minimal top bar */}
        {!displayMode.startsWith("preview") && <TopBar />}
        {/* Editor/Preview split */}
        <div className="flex flex-1 min-h-0 min-w-0 relative">
          {/* Editor Panel */}
          {!displayMode.startsWith("preview") && <EditorPanel editorWidth={editorWidth} />}
          {/* Resizable Divider */}
          {!displayMode.startsWith("preview") && (
            <div
              className="w-2 cursor-col-resize bg-neutral-emphasis hover:bg-primary-border active:bg-primary-border transition-colors duration-100 z-10"
              onMouseDown={(e: MouseEvent) => {
                if (e.button !== 0) return;
                e.preventDefault();
                dragging.current = true;
              }}
              onDoubleClick={handleDividerDoubleClick}
              role="separator"
              aria-orientation="vertical"
              tabIndex={-1}
            />
          )}

          {/* Preview Panel */}
          <div
            className={cnm("flex flex-col min-w-0 h-full", {
              "flex-row flex-1 w-full": displayMode !== "all",
            })}
            style={previewPanelStyle}
          >
            <div className="flex-1 min-h-0 min-w-0">
              <PreviewPanel />
            </div>
          </div>
        </div>
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};
