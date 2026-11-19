import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "StateChip",
  tier: 1,
  category: "Data display",
  exports: ["StateChip"],
  intent: ["The lifecycle state of a task, project or annotation"],
  use_when:
    "A state that comes from the state registry in @humansignal/app-common (TaskStateChip, AnnotationStateChip, ProjectStateChip wrap it).",
  never_when: ["A Badge with a colour picked at the call site for a registered state"],
  replaces: [],
});
