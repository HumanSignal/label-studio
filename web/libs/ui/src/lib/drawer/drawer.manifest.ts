import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Drawer",
  tier: 1,
  exports: ["Drawer", "DrawerTrigger", "DrawerClose"],
  intent: ["side editing with the page still visible"],
  use_when: "A panel sliding in from an edge for editing or details while the page context stays visible.",
  never_when: ["blocking decisions (use ModalWindow)", "a fixed-position div animated by hand"],
  replaces: [],
});
