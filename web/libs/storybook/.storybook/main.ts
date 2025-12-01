import type { StorybookConfig } from "@storybook/react-webpack5";

const config: StorybookConfig = {
  stories: ["../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))", "../../../apps/**/*.@(mdx|stories.@(js|jsx|ts|tsx))"],

  staticDirs: ["../public"],

  addons: ["@nx/react/plugins/storybook", "@storybook/addon-docs", "../addons/theme-toggle/register"],

  webpackFinal(config) {
    const css_prefix = "ls-";
    const rules = config.module?.rules ?? [];

    for (const rule of rules) {
      if (!rule || typeof rule === "string") continue;

      const testString = rule.test?.toString() ?? "";
      const isCss = testString.includes("\\.css");
      const isScss = testString.includes("scss") || testString.includes("sass");

      if (isCss) {
        rule.exclude = /tailwind\.css/;
      }

      // Apply BEM class prefixing to non-module SCSS files
      if (isScss && rule.oneOf) {
        const scssRules = rule.oneOf.filter((r: any) => {
          if (!r.use) return false;
          const testString = r.test?.toString() ?? "";
          // Skip CSS modules and node_modules
          if (testString.match(/module/) || r.exclude?.toString().includes("node_modules")) return false;
          // Target rules with css-loader
          return (
            testString.match(/scss|sass/) &&
            Array.isArray(r.use) &&
            r.use.some((u: any) => u.loader && u.loader.includes("css-loader"))
          );
        });

        scssRules.forEach((r: any) => {
          const cssLoader = r.use.find((use: any) => use.loader && use.loader.includes("css-loader"));

          if (cssLoader && cssLoader.options) {
            cssLoader.options.modules = {
              localIdentName: `${css_prefix}[local]`,
              getLocalIdent(ctx: any, _ident: any, className: string) {
                // Skip prefixing for Storybook preview styles (targets Storybook DOM classes)
                if (ctx.resourcePath?.includes("preview.scss")) return className;
                if (className.includes("ant")) return className;
              },
            };
          }
        });
      }
    }

    return {
      ...config,
      module: {
        ...(config.module ?? {}),
        rules: [
          {
            test: /tailwind\.css/,
            exclude: /node_modules/,
            use: [
              "style-loader",
              {
                loader: "css-loader",
                options: {
                  importLoaders: 1,
                },
              },
              "postcss-loader",
            ],
          },

          ...(config.module?.rules ?? []),
        ],
      },
    };
  },

  framework: "@storybook/react-webpack5",

  typescript: {
    reactDocgen: "react-docgen",
  },
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
