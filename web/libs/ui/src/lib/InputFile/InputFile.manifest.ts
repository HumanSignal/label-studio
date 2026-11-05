import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "InputFile",
  tier: 1,
  exports: ["InputFile"],
  intent: ["pick a file from disk"],
  use_when: "A control that opens the file picker for one or several files.",
  never_when: ["a raw <input type=file>", "the full collection upload flow (use CollectionUploader)"],
  replaces: [],
});
