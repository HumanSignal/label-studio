import { inject, observer } from "mobx-react";
import { useEffect } from "react";
import { Space } from "../../common/Space/Space";
import { Toggle } from "@humansignal/ui";
import ToolsManager from "../../tools/Manager";
import { cn } from "../../utils/bem";
import "./DynamicPreannotationsToggle.scss";

export const DynamicPreannotationsToggle = inject("store")(
  observer(({ store }) => {
    const enabled = store.hasInterface("auto-annotation") && !store.forceAutoAnnotation;

    useEffect(() => {
      if (!enabled) store.setAutoAnnotation(false);
    }, [enabled]);

    return enabled ? (
      <div className={cn("dynamic-preannotations").toClassName()}>
        <div className={cn("dynamic-preannotations").elem("wrapper").toClassName()}>
          <Space spread>
            <Toggle
              checked={store.autoAnnotation}
              onChange={(e) => {
                const checked = e.target.checked;

                store.setAutoAnnotation(checked);

                if (!checked) {
                  ToolsManager.allInstances().forEach((inst) => inst.selectDefault());
                }
              }}
              label="Auto-Annotation"
              data-testid="bottombar-auto-annotation-toggle"
            />
          </Space>
        </div>
      </div>
    ) : null;
  }),
);
