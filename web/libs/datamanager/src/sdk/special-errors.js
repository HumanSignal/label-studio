import { FF_FIT_1304_STRICT_OVERLAP, isFF } from "../utils/feature-flags";

// Returns true to suppress (swallow) the error, false to bubble to the app-level global handler
// (ApiProvider) so it can show modals:
// - 403 PAUSED: user is paused in the project
// - 400 OVERLAP_REACHED: annotation overlap limit reached (only when the feature flag is enabled)
// Used by lsf-sdk (annotation submit/skip) so 403 PAUSED / overlap errors bubble to the app's
// ApiProvider handler (DataManager "error" event) instead of being swallowed as a generic DM error.
export const errorHandlerAllowSpecialErrors = (result) => {
  const isPaused =
    result?.status === 403 &&
    typeof result?.response === "object" &&
    result?.response?.display_context?.reason === "PAUSED";

  // Only handle OVERLAP_REACHED when feature flag is enabled
  const isOverlapReached =
    isFF(FF_FIT_1304_STRICT_OVERLAP) &&
    result?.status === 400 &&
    typeof result?.response === "object" &&
    result?.response?.display_context?.reason === "OVERLAP_REACHED";

  // Return false to allow these errors to bubble up to the global handler
  return !(isPaused || isOverlapReached);
};
