/**
 * Stub for @humansignal/editor in tests so konva/canvas and full editor don't load.
 * PreviewPanel checks `if (!LabelStudio) return` so we export null to skip mounting.
 */
export const LabelStudio = null;
export default { LabelStudio };
