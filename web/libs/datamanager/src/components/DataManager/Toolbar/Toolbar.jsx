import { inject, observer } from "mobx-react";
import React from "react";
import { Block } from "../../../utils/bem";
import { FF_LOPS_E_10, isFF } from "../../../utils/feature-flags";
import { Space } from "../../Common/Space/Space";
import "./TabPanel.styl";

const injector = inject(({ store }) => {
  return {
    store,
  };
});

export const Toolbar = injector(
  observer(({ store }) => {
    const isNewUI = isFF(FF_LOPS_E_10);

    return (
      <Block name="tab-panel" mod={{ newUI: isNewUI }}>
        {store.SDK.toolbarInstruments.map((section, i) => {
          return (
            <Space size="small" key={`section-${i}`}>
              {section.map((instrument, i) => {
                const Instrument = store.SDK.getInstrument(instrument);

                return Instrument ? (
                  <Instrument key={`instrument-${instrument}-${i}`} size={isNewUI ? "large" : "medium"} />
                ) : null;
              })}
            </Space>
          );
        })}
      </Block>
    );
  }),
);
