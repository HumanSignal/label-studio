import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "DropZone",
  tier: 1,
  exports: ["DropZone"],
  intent: ["a place to drop files or pick them from the file dialog"],
  use_when:
    "Files can be dragged onto an area of the page or picked by clicking it: imports, uploads, attachments. The content says what to drop and that clicking browses.",
  never_when: [
    "a hand-built dashed div or button with onDrop and a hidden file input",
    "a single file picker with no drop target (use InputFile)",
    "the Data Collection submission flow (use CollectionUploader from Interface Components)",
  ],
  props_rules: [
    "onFiles receives a FileList for both a drop and a pick",
    "active highlights the zone while a drag happens elsewhere on the page",
  ],
  replaces: [],
});
