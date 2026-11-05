import "@humansignal/ui/src/tailwind.css";
import "./preview.prefix.css";
import "../addons/theme-toggle/preview";
import { Controls, Description, Primary, Stories, Subtitle, Title } from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react";
import { WhenToUse } from "./blocks/when-to-use";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
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
