import { createContext } from 'react';
import { TimelineContextValue } from './Types';

export const TimelineContext = createContext<TimelineContextValue>({
  position: 0,
  length: 0,
  regions: [],
  step: 10,
  playing: false,
  settings: {},
  visibleWidth: 0,
  seekOffset: 0,
  data: undefined,
});

export const TimelineContextProvider = TimelineContext.Provider;
