import { ff } from "@humansignal/core";
import { types } from "mobx-state-tree";
import ToolsManager from "../tools/Manager";
import * as Tools from "../tools";
import { FF_DEV_3391 } from "../utils/feature-flags";

export const ToolManagerMixin = types.model().actions((self) => {
  return {
    afterAttach() {
      if (ff.isActive(FF_DEV_3391) && self.annotationStore.initialized) {
        self.tools = self.annotationStore.names.get(self.name).tools;
        return;
      }
      const toolNames = self.toolNames ?? [];
      const manager = ToolsManager.getInstance({ name: self.toname });
      const env = { manager, control: self };
      const tools = {};

      toolNames.forEach((toolName) => {
        if (toolName in Tools) {
          const configuredStrokeWidth = Number(self.strokewidth);
          const toolConfig =
            toolName === "Brush" && Number.isFinite(configuredStrokeWidth)
              ? { strokeWidth: configuredStrokeWidth }
              : {};
          const tool = Tools[toolName].create(toolConfig, env);

          tools[toolName] = tool;
        }
      });

      self.tools = tools;

      // copy tools from control tags into object tools manager
      // [DOCS] each object tag may have an assigned tools
      // manager. This assignment may happen because user asked
      // for it through the config, or because the attached
      // control tags are complex and require additional UI
      // interfaces. Each control tag defines a set of tools it
      // supports
      manager.addToolsFromControl(self);
    },
  };
});
