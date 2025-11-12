import { types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { EnterpriseBadge } from "@humansignal/ui";
import Registry from "../core/Registry";
import ControlBase from "./control/Base";

const CustomInterfaceModel = types.compose(
  "CustomInterfaceModel",
  ControlBase,
  types.model({
    type: "custominterface",
  }),
);

// Register custom tag placeholder for opensource
if (!APP_SETTINGS?.billing?.enterprise && !Registry.models.custominterface) {
  const CustomComponentWrapper = observer(({ item }) => {
    return (
      <div className="flex items-center gap-2 py-base">
        <EnterpriseBadge />
        CustomInterface tag is only available in the enterprise.
      </div>
    );
  });

  Registry.addTag("custominterface", CustomInterfaceModel, CustomComponentWrapper);
  Registry.addObjectType(CustomInterfaceModel);
}
