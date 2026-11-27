import type React from "react";
import { forwardRef } from "react";
import { useAtomValue } from "jotai";
import { IconCollapseSmall, IconExpandSmall } from "@humansignal/icons";
import { cnm } from "@humansignal/ui";
import { annotationAtom, sampleTaskAtom } from "../../atoms/configAtoms";

export type BottomPanelRef = {
  handleAnnotationUpdate: (annotation: any) => void;
};

interface BottomPanelProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const HEADER_HEIGHT = 33;

export const BottomPanel = forwardRef<BottomPanelRef, BottomPanelProps>(({ isCollapsed, setIsCollapsed }, _ref) => {
  const currentAnnotation = useAtomValue(annotationAtom);
  const sampleTask = useAtomValue(sampleTaskAtom);

  return (
    <div
      className={cnm("flex flex-col transition-all duration-200 min-h-0 min-w-0 h-full", {
        "border-t border-neutral-border": isCollapsed,
      })}
    >
      {/* Header (always visible, 33px) */}
      <div
        className="relative h-[33px] flex flex-row items-center bg-neutral-surface select-none"
        style={{ minHeight: HEADER_HEIGHT, maxHeight: HEADER_HEIGHT }}
      >
        <div className="flex flex-row w-full">
          <div className="flex-1 flex items-center font-semibold text-body-small px-4">Data Input</div>
          <div className="w-[1px] h-[33px] bg-neutral-border" />
          <div className="flex-1 flex items-center font-semibold text-body-small px-4">Data Output</div>
        </div>
        {/* Floating collapse/expand button */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="lsf-button lsf-button_look_ lsf-collapsible-bottom-panel-toggle absolute right-[5px] top-1/2 -translate-y-1/2 !h-6 !w-6 !p-0 flex items-center justify-center !bg-transparent !border-none"
          style={{ zIndex: 10 }}
        >
          {isCollapsed ? <IconExpandSmall /> : <IconCollapseSmall />}
        </button>
      </div>
      {/* Panel content (only when not collapsed) */}
      {!isCollapsed && (
        <div className="flex flex-1 min-h-0">
          {/* Sample Data Panel */}
          <div className="flex-1 border-r border-neutral-border p-4 overflow-auto">
            <pre className="text-body-small whitespace-pre-wrap">{JSON.stringify(sampleTask.data, null, 2)}</pre>
          </div>
          {/* Annotation Output Panel */}
          <div className="flex-1 p-4 overflow-auto">
            <pre className="text-body-small whitespace-pre-wrap">
              {JSON.stringify(currentAnnotation || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});
