// Function-based CustomInterface available only in Label Studio Enterprise
import React from "react";

import { types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { EnterpriseBadge } from "@humansignal/ui";
import Registry from "../core/Registry";

const CustomInterfaceModel = types.model("CustomInterfaceModel", {});

// Register custom tag placeholder for opensource
if (!APP_SETTINGS?.billing?.enterprise && !Registry.models.custominterface) {
  const CustomComponentWrapper = observer(({ item }) => {
    return (
      <div className="flex items-center gap-2">
        <EnterpriseBadge />
        CustomInterface tag is only available in the enterprise.
      </div>
    );
  });

  Registry.addTag("custominterface", CustomInterfaceModel, CustomComponentWrapper);
  Registry.addObjectType(CustomInterfaceModel);
}
