/**
 * Callback on submit completion
 */
function onSubmitCompletion() {}

/**
 * Callback on update completion
 */
function onUpdateCompletion() {}

/**
 * Callback on delete completion
 */
function onDeleteCompletion() {}

/**
 * Callback on skip task
 */
function onSkipTask() {}

/**
 * Callback on task load
 */
function onTaskLoad() {}

/**
 * Callback on Label Studio load
 */
function onLabelStudioLoad() {}

/**
 * Callback when labeled region gets created
 */
function onEntityCreate() {}

/**
 * Callback when labeled region gets deleted
 */
function onEntityDelete() {}

/**
 * Callback when ground truth button gets pressed
 */
function onGroundTruth() {}

export default {
  onDeleteCompletion,
  onEntityCreate,
  onEntityDelete,
  onGroundTruth,
  onLabelStudioLoad,
  onSkipTask,
  onSubmitCompletion,
  onTaskLoad,
  onUpdateCompletion,
};
