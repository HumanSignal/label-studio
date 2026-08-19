import { Fragment } from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import { useTranslation } from "react-i18next";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { Tool } from "../components/Toolbar/Tool";
import { FlyoutMenu } from "../components/Toolbar/FlyoutMenu";
import { IconExpandTool, IconHandTool, IconZoomIn, IconZoomOut } from "@humansignal/icons";

const ToolView = observer(({ item }) => {
  const { t } = useTranslation();

  return (
    <Fragment>
      <Tool
        active={item.selected}
        icon={<IconHandTool />}
        ariaLabel="pan"
        label={t("editor:zoomPanImage")}
        shortcut="tool:pan-image"
        onClick={() => {
          const sel = item.selected;

          item.manager.selectTool(item, !sel);
        }}
      />
      <Tool
        icon={<IconZoomIn />}
        ariaLabel="zoom-in"
        label={t("editor:zoomIn")}
        shortcut="tool:zoom-in"
        onClick={() => {
          item.handleZoom(1);
        }}
      />
      <FlyoutMenu
        icon={<IconExpandTool />}
        items={[
          {
            label: t("editor:zoomToFit"),
            shortcut: "tool:zoom-to-fit",
            onClick: () => {
              item.sizeToFit();
            },
          },
          {
            label: t("editor:zoomToActualSize"),
            shortcut: "tool:zoom-to-actual",
            onClick: () => {
              item.sizeToOriginal();
            },
          },
        ]}
      />
      <Tool
        icon={<IconZoomOut />}
        ariaLabel="zoom-out"
        label={t("editor:zoomOut")}
        shortcut="tool:zoom-out"
        onClick={() => {
          item.handleZoom(-1);
        }}
      />
    </Fragment>
  );
});

const _Tool = types
  .model("ZoomPanTool", {
    // image: types.late(() => types.safeReference(Registry.getModelByTag("image")))
    group: "control",
  })
  .volatile(() => ({
    canInteractWithRegions: false,
  }))
  .views((self) => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },

    get stageContainer() {
      return self.obj.stageRef.container();
    },
  }))
  .actions((self) => ({
    /**
     * Indicates that zoom tool can't interact with regions at all
     */
    shouldSkipInteractions() {
      return true;
    },

    mouseupEv() {
      self.mode = "viewing";
      self.stageContainer.style.cursor = "grab";
    },

    updateCursor() {
      if (!self.selected || !self.obj?.stageRef) return;

      self.stageContainer.style.cursor = "grab";
    },

    afterUpdateSelected() {
      self.updateCursor();
    },

    handleDrag(ev) {
      const item = self.obj;
      const posx = item.zoomingPositionX + ev.movementX;
      const posy = item.zoomingPositionY + ev.movementY;

      item.setZoomPosition(posx, posy);
    },

    mousemoveEv(ev) {
      const zoomScale = self.obj.zoomScale;

      if (zoomScale <= 1) return;
      if (self.mode === "moving") {
        self.handleDrag(ev);
        self.stageContainer.style.cursor = "grabbing";
      }
    },

    mousedownEv(ev) {
      // don't pan on right click
      if (ev.button === 2) return;

      self.mode = "moving";
      self.stageContainer.style.cursor = "grabbing";
    },

    handleZoom(val) {
      const item = self.obj;

      item.handleZoom(val);
    },

    sizeToFit() {
      const item = self.obj;

      item.sizeToFit();
    },

    sizeToAuto() {
      const item = self.obj;

      item.sizeToAuto();
    },

    sizeToOriginal() {
      const item = self.obj;

      item.sizeToOriginal();
    },
  }));

const Zoom = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { Zoom };
