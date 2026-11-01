// design-sync bundle entry for @humansignal/ui (the main namespace).
// The global styles mirror what the reference storybook loads (.storybook/preview.ts):
// tailwind.css (base/components/utilities) + styles.prefix.css (design tokens, typography, colors).
import "../../libs/ui/src/tailwind.css";
import "../../libs/ui/src/styles.prefix.css";
// Host-app variables the components read (see the file header).
import "./host-vars.css";

export * from "../../libs/ui/src/index";
// Not in the src/index.ts barrel, but apps deep-import it (@humansignal/ui/lib/date-range-picker) and it has stories.
export * from "../../libs/ui/src/lib/date-range-picker";
