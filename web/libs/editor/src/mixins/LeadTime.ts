import { types } from 'mobx-state-tree';

// both approaches are valid, so code is ready for both,
// but currently we use instant logic hardcoded
enum LEAD_TIME_LOGIC_OPTIONS {
  'inertial', // every action counted, minus overlaps
  'instant', // close events are recorded from first to last with no extra time
}

// stored length of interactions in ms, also works as a debounce time
const LEAD_TIME_INTERACTION = 500;

/**
 * Calculate lead time just by calling `countTime()` on every interaction.
 * Result stored in `leadTime`.
 *
 * Explanation of how we count time + difference between inertial and instant logic:
 *
 * INERTIAL                                       2nd event out of
 *               3 events                         debounce frame
 *  debounce     with overlaps       1 event      counted separately
 *   frame       |          |        |   |        |   ||      |
 * --|---|-------*--*---*------------*------------*----*--*------> events on timeline
 *               |      |            |   |        |   ||   |
 *               last event          same         same   2 events inside
 *               stops counting,     counting            debounce frame
 * INSTANT       no extra time                           no extra time
 */
const LeadTimeMixin = types
  .model({
    leadTime: 0,
  })
  .volatile(() => ({
    leadTimeLogic: LEAD_TIME_LOGIC_OPTIONS.inertial,
    // when did the last event happen, used only for instant logic
    lastRecordedTime: 0,
    // time of the end of the current debounce frame
    debouncedTime: 0,
  }))
  .actions(self => ({
    _countTimeInertial() {
      const now = Date.now();

      // new sequence of events
      if (self.debouncedTime < now) {
        self.leadTime += LEAD_TIME_INTERACTION;
      } else {
        // debounced call
        // substracting overlapped time
        self.leadTime += LEAD_TIME_INTERACTION - (self.debouncedTime - now);
      }

      self.debouncedTime = now + LEAD_TIME_INTERACTION;
    },
    _countTimeInstant() {
      const now = Date.now();

      // new sequence of events
      if (self.debouncedTime < now) {
        self.leadTime += LEAD_TIME_INTERACTION;
        self.lastRecordedTime = now + LEAD_TIME_INTERACTION;
      } else {
        // debounced call.
        // if event happened inside of initial debounced frame, it won't be counted.
        // if it happened after some events, we store the time passed after the last one.
        // debounced frame will be increased by LEAD_TIME_INTERACTION in both cases.
        if (now > self.lastRecordedTime) {
          self.leadTime += now - self.lastRecordedTime;
          self.lastRecordedTime = now;
        }
      }

      self.debouncedTime = now + LEAD_TIME_INTERACTION;
    },
  }))
  .actions(self => ({
    /**
     * Calculate leadTime; call it on every interaction.
     */
    countTime() {
      if (self.leadTimeLogic === LEAD_TIME_LOGIC_OPTIONS.inertial) {
        self._countTimeInertial();
      } else if (self.leadTimeLogic === LEAD_TIME_LOGIC_OPTIONS.instant) {
        self._countTimeInstant();
      }
    },
    resetLeadTimeCounters() {
      self.lastRecordedTime = 0;
      self.debouncedTime = 0;
    },
  }));

export default LeadTimeMixin;
