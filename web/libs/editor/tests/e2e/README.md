# LSF E2E Tests (CodeceptJS + Playwright)

This directory contains end-to-end tests for the Label Studio Frontend (LSF) editor, run via CodeceptJS with a Playwright backend.

## Known flaky tests (CI)

The following tests are known to be flaky in CI headless runs and may fail intermittently. Failures are often pre-existing and not necessarily caused by recent branch changes. They are deprioritized for blocking merges:

- **Audio WebAudio Decoder** (`tests/audio/audio-webaudio-decoder.test.js`): "Check if multiple regions are working changing labels" and related audio region/outliner assertions. Failures typically involve `expected visible elements '[]' not to be empty` or outliner region count mismatches after drag operations.
- **Audio regions** (e.g. "Nonexistent from_name -> Audio regions"): Similar outliner/visibility assertions in audio flows.

If CI fails only on these audio tests, consider re-running the job or treating as non-blocking while the flakiness is addressed (e.g. more deterministic waits or CI-only retries).
