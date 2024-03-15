import type { StorybookConfig } from "@storybook/react-vite";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { mergeConfig } from "vite";
import svgr from "vite-plugin-svgr";

const config: StorybookConfig = {
  stories: ["../src/lib/**/*.stories.@(js|jsx|ts|tsx|mdx)", "../src/stories/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [
        nxViteTsPaths(),
        svgr({
          esbuildOptions: {},
          svgrOptions: { plugins: ["@svgr/plugin-jsx"], ref: true },
        }),
      ],
    }),
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
