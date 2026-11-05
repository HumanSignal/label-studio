import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Toast",
  tier: 1,
  exports: ["Toast", "ToastAction", "ToastProvider", "ToastViewport"],
  intent: ["the result of an action, shown briefly"],
  use_when: "Confirmation or failure of an action the user just took, through useToast.",
  never_when: ["persistent information (use Message or Callout)", "alert() or a hand-made notification bar"],
  replaces: [],
});
