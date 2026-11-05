import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "StateChip",
  tier: 1,
  exports: ["StateChip"],
  intent: ["the lifecycle state of a task, project or annotation"],
  use_when:
    "A state that comes from the state registry in @humansignal/app-common (TaskStateChip, AnnotationStateChip, ProjectStateChip wrap it).",
  never_when: ["a Badge with a colour picked at the call site for a registered state"],
  replaces: [],
});
