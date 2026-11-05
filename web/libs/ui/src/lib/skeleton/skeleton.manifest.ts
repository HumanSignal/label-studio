import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Skeleton",
  tier: 1,
  exports: ["Skeleton"],
  intent: ["a layout still loading"],
  use_when: "Placeholder blocks in the shape of the content that is about to appear.",
  never_when: ["an action in progress (use Spinner)", "grey divs with a pulse class"],
  replaces: ["services/lso/web/libs/datamanager/src/components/Common/SkeletonLoader/SkeletonLoader.tsx"],
});
