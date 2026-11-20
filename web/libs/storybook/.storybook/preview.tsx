import "@humansignal/ui/src/tailwind.css";
import "./preview.prefix.css";
import "../addons/theme-toggle/preview";
import { Controls, Description, Primary, Stories, Subtitle, Title } from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react";
import { WhenToUse } from "./blocks/when-to-use";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    options: {
      // One sidebar section per category. Storybook reads this statically, so the list is literal;
      // the manifest guard test keeps the categories in it equal to CATEGORIES.
      storySort: {
        method: "alphabetical",
        order: [
          "Design",
          "Inputs",
          "Data display",
          "Feedback",
          "Surfaces",
          "Navigation",
          "Layout",
          "Utilities",
          "Product",
          "Components",
          "Editor",
        ],
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <WhenToUse />
          <Primary />
          <Controls />
          <Stories />
        </>
      ),
    },
  },
};

export default preview;
