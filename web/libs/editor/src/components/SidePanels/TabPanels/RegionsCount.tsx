import { observer } from "mobx-react";
import { Elem } from "../../../utils/bem";

export const RegionsCount = observer(({ regions }: any) => {
  return [
    "Regions",
    <Elem name="counter" size="small">
      {regions.regions?.length ?? "0"}
    </Elem>,
  ];
});
