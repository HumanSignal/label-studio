import type React from "react";
import { Elem } from "../../../utils/bem";
import { TimeDurationControl } from "../../TimeDurationControl/TimeDurationControl";
import "./gps-region-properties.scss";
interface GPSRegionPropertiesProps {
  region: any;
}

const GPSRegionProperties: React.FC<GPSRegionPropertiesProps> = ({ region }) => {
  const changeStartTimeHandler = (value: number) => {
    region.setProperty("start", value);
  };

  const changeEndTimeHandler = (value: number) => {
    region.setProperty("end", value);
  };

  const trackDuration = region.object?.trackDuration;

  return (
    <Elem name="wrapper-time-control" className="ls-region-editor__wrapper-time-control">
      <TimeDurationControl
        startTime={region.start}
        endTime={region.end}
        minTime={0}
        maxTime={trackDuration}
        isSidepanel={true}
        onChangeStartTime={changeStartTimeHandler}
        onChangeEndTime={changeEndTimeHandler}
        showLabels
        showDuration
      />
    </Elem>
  );
};

export default GPSRegionProperties;