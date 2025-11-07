import { inject, observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Space } from "../../Common/Space/Space";
import "./TabPanel.scss";

const injector = inject(({ store }) => {
  return {
    store,
  };
});

export const Toolbar = injector(
  observer(({ store }) => {
    return (
      <div className={cn("tab-panel").toClassName()}>
        {store.SDK.toolbarInstruments.map((section, i) => {
          return (
            <Space size="small" key={`section-${i}`}>
              {section.map((instrument, i) => {
                const Instrument = store.SDK.getInstrument(instrument);

                return Instrument ? <Instrument key={`instrument-${instrument}-${i}`} size="small" /> : null;
              })}
            </Space>
          );
        })}
      </div>
    );
  }),
);
