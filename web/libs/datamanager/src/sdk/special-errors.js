import { FF_FIT_1304_STRICT_OVERLAP, isFF } from "../utils/feature-flags";

// Returns true to suppress (swallow) the error, false to bubble to the app-level global handler
// (ApiProvider) so it can show modals:
// - 403 PAUSED: user is paused in the project
// - 400 OVERLAP_REACHED: annotation overlap limit reached (only when the feature flag is enabled)
// Shared by lsf-sdk (annotation submit/skip) and comments-sdk (comment create/update) so a paused
// user gets the same pause modal regardless of which write they attempt.
// True when an apiCall result is a 403 PAUSED response (user is paused in the project).
export const isPausedResult = (result) =>
  result?.status === 403 &&
  typeof result?.response === "object" &&
  result?.response?.display_context?.reason === "PAUSED";

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
