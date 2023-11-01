import React, { FC } from 'react';
import { Block } from '../../utils/bem';

import './TimeDurationControl.styl';
import { TimeBox } from './TimeBox';

export interface TimerProps {
  isSidepanel: boolean | undefined;
  startTime: number;
  endTime: number | undefined;
  minTime: number;
  maxTime: number | undefined;
  currentTime?: number;
  startTimeReadonly?: boolean;
  endTimeReadonly?: boolean;
  onChangeStartTime?: (value: number) => void;
  onChangeEndTime?: (value: number) => void;
}

export const TimeDurationControl: FC<TimerProps> = ({
  isSidepanel = false,
  startTime,
  endTime = 0,
  minTime,
  maxTime = 0,
  currentTime,
  startTimeReadonly = false,
  endTimeReadonly = false,
  onChangeStartTime,
  onChangeEndTime,
}) => {
  const _currentTime = !currentTime ? startTime : currentTime;

  const handleChangeCurrentTime = (value: number) => {
    if (value >= minTime && value <= maxTime && value <= endTime) onChangeStartTime?.(value);
  };

  const handleChangeEndTime = (value: number) => {
    if (value >= minTime && value <= maxTime && value >= _currentTime) onChangeEndTime?.(value);
  };

  return (
    <Block name="timer-duration-control">
      <TimeBox
        sidepanel={isSidepanel}
        readonly={startTimeReadonly}
        value={_currentTime}
        onChange={handleChangeCurrentTime}
        data-testid="timebox-current-time"
      />
      <TimeBox
        sidepanel={isSidepanel}
        readonly={endTimeReadonly}
        value={endTime}
        onChange={handleChangeEndTime}
        data-testid="timebox-end-time"
        inverted
      />
    </Block>
  );
};
