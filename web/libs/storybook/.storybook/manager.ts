import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

const theme = create({
  base: "dark",
  brandTitle: "Label Studio",
  brandUrl: "https://labelstud.io",
  brandImage: "logo.svg",
  brandTarget: "_blank",
});

addons.setConfig({
  theme,
});
