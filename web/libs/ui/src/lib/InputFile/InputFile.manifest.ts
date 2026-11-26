import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "InputFile",
  tier: 1,
  category: "Inputs",
  sizing: "control",
  exports: ["InputFile"],
  intent: ["Pick a file from disk"],
  use_when:
    "A button that opens the file picker for one or several files, with the chosen names beside it. For a drag-and-drop area use DropZone.",
  never_when: [
    "A raw <input type=file>",
    "The full collection upload flow (use CollectionUploader from Interface Components)",
  ],
  replaces: [],
});
