import "./core/feature-flags";
import "./assets/styles/global.scss";

// CRITICAL: Import all tags BEFORE LabelStudio to ensure they're registered
// before store initialization calls Registry.modelsArr()
import "./tags/object";
import "./tags/control";

import { LabelStudio } from "./LabelStudio";

window.LabelStudio = LabelStudio;

export default LabelStudio;

export { LabelStudio };
