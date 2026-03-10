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

      if (isCss && !isScss) {
        rule.exclude = [/tailwind\.css/, /\.prefix\.css$/];
      }

      if (isScss && rule.oneOf) {
        for (const oneOfRule of rule.oneOf) {
          if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
            oneOfRule.use = oneOfRule.use.filter(
              (use: any) => !(use.loader && use.loader.includes("sass-loader")),
            );
          }
        }

        const scssRules = rule.oneOf.filter((r: any) => {
          if (!r.use) return false;
          const testString = r.test?.toString() ?? "";
          if (testString.match(/module/) || r.exclude?.toString().includes("node_modules")) return false;
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
                if (ctx.resourcePath?.includes("preview.prefix.css")) return className;
                if (className.includes("ant")) return className;
              },
            };
          }
        });

        rule.test = /\.(prefix\.css|scss|sass)$/;
        for (const oneOfRule of rule.oneOf) {
          if (oneOfRule.test) {
            const innerTest = oneOfRule.test.toString();
            if (innerTest.match(/scss|sass/) && !innerTest.includes("module")) {
              oneOfRule.test = /\.(prefix\.css|scss|sass)$/;
            }
          }
        }
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
