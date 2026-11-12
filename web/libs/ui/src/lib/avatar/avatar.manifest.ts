import { defineManifest } from "../../ds-manifest";

export default defineManifest([
  {
    name: "Avatar",
    tier: 1,
    exports: ["Avatar", "AvatarStack", "AvatarBadge"],
    intent: ["a person or several people"],
    use_when: "One person (initials or photo, tooltip, badge) or a stack of people with a +N tile.",
    never_when: [
      "a hand-rolled row of avatars or +N tile",
      "a badge drawn on an avatar by hand",
      "userpic classes mixed onto Avatar",
    ],
    props_rules: ["size is a name (smaller, small, medium, large, larger), never a px number or CSS size"],
    replaces: ["services/lse/web/apps/labelstudio/src/pages/Organization/Models/@components/RunHistory/RunHistory.tsx"],
  },
]);
