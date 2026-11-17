import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Timeline",
  tier: 1,
  exports: ["Timeline"],
  intent: ["a chronological, optionally expandable list of events"],
  use_when:
    "A vertical, chronological list of entries, each with a marker, a title, optional metadata and optional expandable children — activity feeds, audit trails, event logs.",
  never_when: ["a wizard's ordered steps (use Stepper)", "a flat list with no chronology or markers"],
  replaces: [],
});
