import React from "react";
import { observer } from "mobx-react";
import { Html } from "@react-three/drei";
import type { Object3DModelType } from "./model";

export const LabelOnRegion = observer(({ item }: { item: Object3DModelType }) => {
  const labelText = item
    .states()
    .map((s) => s.getSelectedString())
    .filter(Boolean)
    .join(", ");

  if (!labelText) return null;

  return (
    <Html position={[item.x, item.y + item.height / 2, item.z]}>
      <div
        style={{
          background: "white",
          padding: "2px 5px",
          borderRadius: "3px",
          fontSize: "12px",
        }}
      >
        {labelText}
      </div>
    </Html>
  );
});
