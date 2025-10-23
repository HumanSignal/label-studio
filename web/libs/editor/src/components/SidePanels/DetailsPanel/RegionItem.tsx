import { IconEyeClosed, IconEyeOpened, IconPlus, IconRelationLink, IconTrash, IconWarning } from "@humansignal/icons";
import { Button, type ButtonProps } from "@humansignal/ui";
import chroma from "chroma-js";
import { observer } from "mobx-react";
import { type FC, forwardRef, useMemo, useState } from "react";
import { WithHotkey } from "../../../common/Hotkey/WithHotkey";
import { CREATE_RELATION_MODE } from "../../../stores/Annotation/LinkingModes";
import { cn } from "../../../utils/bem";
import { NodeIcon } from "../../Node/Node";
import { LockButton } from "../Components/LockButton";
import { RegionLabels } from "./RegionLabels";

interface RegionItemProps {
  region: any;
  withActions?: boolean;
  compact?: boolean;
  withIds?: boolean;
  mainDetails?: FC<{ region: any }>;
  metaDetails?: FC<{
    region: any;
    editMode?: boolean;
    cancelEditMode?: () => void;
    enterEditMode: () => void;
  }>;
}

export const RegionItem: FC<RegionItemProps> = observer(
  ({
    region,
    compact = false,
    withActions = true,
    withIds = true,
    mainDetails: MainDetails,
    metaDetails: MetaDetails,
  }) => {
    const { annotation } = region;
    const { selectedRegions: nodes } = annotation;
    const [editMode, setEditMode] = useState(false);

    const hasEditableRegions = useMemo(() => {
      return !!nodes.find((node: any) => !node.isReadOnly() && !node.classification);
    }, [nodes]);

    const color = useMemo(() => {
      const bgColor = region.background ?? region.getOneColor() ?? "#666";

      return chroma(bgColor).alpha(1);
    }, [region.background, region.style]);

    return (
      <div className={cn("detailed-region").mod({ compact }).toClassName()} data-testid="detailed-region">
        <div className={cn("detailed-region").elem("head").toClassName()} style={{ color: color.css() }}>
          <div className={cn("detailed-region").elem("title").toClassName()}>
            <div className={cn("detailed-region").elem("icon").toClassName()}>
              <NodeIcon node={region} />
            </div>
            <div className={cn("detailed-region").elem("index").toClassName()}>
              <span className={cn("detailed-region").elem("index_value").toClassName()}>{region.region_index}</span>
            </div>
            <RegionLabels region={region} />
          </div>
          {withIds && <span>{region.cleanId}</span>}
        </div>
        {MainDetails && (
          <div className={cn("detailed-region").elem("content").toClassName()}>
            <MainDetails region={region} />
          </div>
        )}
        {region.isDrawing && (
          <div className={cn("detailed-region").elem("warning").toClassName()}>
            <IconWarning />
            <div className={cn("detailed-region").elem("warning-text").toClassName()}>
              Incomplete {region.type?.replace("region", "") ?? "region"}
            </div>
          </div>
        )}
        {withActions && (
          <RegionAction
            region={region}
            editMode={editMode}
            annotation={annotation}
            hasEditableRegions={hasEditableRegions}
            onEditModeChange={setEditMode}
          />
        )}
        {MetaDetails && (
          <div className={cn("detailed-region").elem("content").toClassName()}>
            <MetaDetails
              region={region}
              editMode={editMode}
              enterEditMode={() => setEditMode(true)}
              cancelEditMode={() => setEditMode(false)}
            />
          </div>
        )}
      </div>
    );
  },
);

const RegionAction: FC<any> = observer(({ region, annotation, editMode, onEditModeChange }) => {
  const entityButtons: JSX.Element[] = [];

  entityButtons.push(
    <WithHotkey binging="region:relation">
      <RegionActionButton
        key="relation"
        variant={annotation.isLinkingMode ? "primary" : "neutral"}
        look={annotation.isLinkingMode ? "filled" : "string"}
        onClick={(_e: any, hotkey?: any) => {
          // If this is triggered by a hotkey, defer to the global bound handler for relations to avoid contention.
          if (hotkey) return;
          if (annotation.isLinkingMode) {
            annotation.stopLinkingMode();
          } else {
            annotation.startLinkingMode(CREATE_RELATION_MODE, region);
          }
        }}
        aria-label="Create Relation"
      >
        <IconRelationLink />
      </RegionActionButton>
    </WithHotkey>,
  );

  entityButtons.push(
    <WithHotkey binging="region:meta">
      <RegionActionButton
        key="meta"
        look={editMode ? "filled" : "string"}
        variant={editMode ? "primary" : "neutral"}
        onClick={() => onEditModeChange(!editMode)}
        aria-label="Edit region's meta"
      >
        <IconPlus />
      </RegionActionButton>
    </WithHotkey>,
  );

  return (
    <div className={cn("region-actions").toClassName()}>
      <div className={cn("region-actions").elem("group").mod({ align: "left" }).toClassName()}>
        {!region.isReadOnly() && entityButtons}
      </div>
      <div className={cn("region-actions").elem("group").mod({ align: "right" }).toClassName()}>
        <LockButton
          item={region}
          annotation={region?.annotation}
          hovered={true}
          locked={region?.locked}
          onClick={() => region.setLocked(!region.locked)}
          displayedHotkey="region:lock"
          variant="neutral"
          look="string"
          aria-label="Unlock Region"
          tooltip="Unlock Region"
        />
        {region.hideable && (
          <RegionActionButton
            aria-label={`${region.hidden ? "Show" : "Hide"} selected region`}
            variant="neutral"
            look="string"
            onClick={region.toggleHidden}
            tooltip={`${region.hidden ? "Show" : "Hide"} selected region`}
          >
            {region.hidden ? <IconEyeClosed /> : <IconEyeOpened />}
          </RegionActionButton>
        )}
        <RegionActionButton
          variant="negative"
          look="string"
          aria-label="Delete selected region"
          disabled={region.isReadOnly()}
          tooltip="Delete selected region"
          onClick={() => annotation.deleteRegion(region)}
        >
          <IconTrash />
        </RegionActionButton>
      </div>
    </div>
  );
});

const RegionActionButton: FC<ButtonProps> = forwardRef(({ children, ...props }, ref) => {
  return (
    <Button ref={ref} variant="neutral" look="string" size="small" {...props}>
      {children}
    </Button>
  );
});
