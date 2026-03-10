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
      if (!(rule as any).oneOf || !rule.test?.toString().includes("css")) continue;

      const ruleAny = rule as any;

      for (const oneOfRule of ruleAny.oneOf) {
        if (!oneOfRule.use || !Array.isArray(oneOfRule.use)) continue;

        oneOfRule.use = oneOfRule.use.filter(
          (use: any) => !(use.loader && /sass-loader|stylus-loader|less-loader/.test(use.loader)),
        );

        const innerTest = oneOfRule.test?.toString() ?? "";
        const cssLoader = oneOfRule.use.find((use: any) => use.loader?.includes("/css-loader/"));

        if (innerTest.includes("module") && cssLoader?.options) {
          cssLoader.options.modules = {
            mode: "local",
            auto: true,
            namedExport: false,
            localIdentName: "[local]--[hash:base64:5]",
          };
        }
      }

      const insertions: number[] = [];
      ruleAny.oneOf.forEach((oneOfRule: any, idx: number) => {
        if (!oneOfRule.test || !oneOfRule.use) return;
        const t = oneOfRule.test.toString();
        if (/^\/\\\.css\$\/$/.test(t) && oneOfRule.use.some((u: any) => u.loader?.includes("/css-loader/"))) {
          insertions.push(idx);
        }
      });

      for (let i = insertions.length - 1; i >= 0; i--) {
        const idx = insertions[i];
        const template = ruleAny.oneOf[idx];
        const prefixUse = template.use.map((u: any) => {
          if (typeof u === "string") return u;
          if (u.loader?.includes("/css-loader/")) {
            return {
              ...u,
              options: {
                ...(u.options ?? {}),
                modules: {
                  localIdentName: `${css_prefix}[local]`,
                  getLocalIdent(ctx: any, _ident: any, className: string) {
                    if (ctx.resourcePath?.includes("preview.prefix.css")) return className;
                    if (className.includes("ant")) return className;
                  },
                },
              },
            };
          }
          return u;
        });

        ruleAny.oneOf.splice(idx, 0, {
          test: /\.prefix\.css$/,
          include: template.include,
          exclude: /node_modules/,
          use: prefixUse,
        });
      }

      ruleAny.exclude = /tailwind\.css/;
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
