import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AcceptedPlugin } from "postcss";
import type { StorybookConfig } from "@storybook/react-vite";
import type { ESBuildOptions, Plugin } from "vite";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import svgr from "vite-plugin-svgr";
import tailwindConfig from "../../../tailwind.config.js";
import postcssImport from "postcss-import";
import { cssModulesGenerateScopedName } from "../../../vite-prefix-css-module";
import { jsxJsPlugin, optimizeDepsAutomaticJsxPlugin } from "../../../vite-lib-jsx-plugins";
import postcssPrefixLsfModule from "../../../postcss-prefix-lsf.cjs";

const { postcssPrefixLsfClasses } = postcssPrefixLsfModule as {
  postcssPrefixLsfClasses: () => AcceptedPlugin;
};
const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))", "../../../apps/**/*.@(mdx|stories.@(js|jsx|ts|tsx))"],

  staticDirs: ["../public"],

  addons: ["@storybook/addon-docs", "../addons/theme-toggle/register"],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal: async (viteConfig) => {
    const root = path.resolve(dirname, "../../..");
    viteConfig.esbuild = {
      ...(viteConfig.esbuild ?? {}),
      jsx: "automatic",
      jsxImportSource: "react",
    } as ESBuildOptions;
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      "@humansignal/icons": path.resolve(root, "libs/ui/src/assets/icons/index.ts"),
      "@humansignal/shad": path.resolve(root, "libs/ui/src/shad"),
      "@humansignal/ui/lib": path.resolve(root, "libs/ui/src/lib"),
      "@humansignal/ui/shad": path.resolve(root, "libs/ui/src/shad"),
      "@humansignal/ui/fonts": path.resolve(root, "libs/ui/src/fonts"),
      "@humansignal/ui": path.resolve(root, "libs/ui"),
      "@humansignal/core/providers": path.resolve(root, "libs/core/src/providers"),
      "@humansignal/core/lib": path.resolve(root, "libs/core/src/lib"),
      "@humansignal/core/hooks": path.resolve(root, "libs/core/src/hooks"),
      "@humansignal/core": path.resolve(root, "libs/core/src"),
      "@humansignal/app-common": path.resolve(root, "libs/app-common/src"),
    };
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.unshift(jsxJsPlugin());
    viteConfig.plugins.push(
      svgr({
        include: ["**/libs/ui/**/*.svg", "**/apps/labelstudio/**/*.svg"],
        svgrOptions: { ref: true, exportType: "named", namedExport: "ReactComponent", svgo: false },
      }),
    );

    viteConfig.optimizeDeps = viteConfig.optimizeDeps ?? {};
    const existingRolldown = viteConfig.optimizeDeps.rolldownOptions ?? {};
    const existingRolldownPlugins = Array.isArray(existingRolldown.plugins) ? existingRolldown.plugins : [];
    viteConfig.optimizeDeps.rolldownOptions = {
      ...existingRolldown,
      plugins: [...existingRolldownPlugins, optimizeDepsAutomaticJsxPlugin() as Plugin],
    };

    viteConfig.server = viteConfig.server ?? {};
    viteConfig.server.fs = viteConfig.server.fs ?? {};
    const existingAllow = viteConfig.server.fs.allow ?? [];
    viteConfig.server.fs.allow = [...new Set([...existingAllow, root, path.resolve(root, "../..")])];

    viteConfig.css = viteConfig.css ?? {};
    viteConfig.css.modules = {
      ...viteConfig.css.modules,
      generateScopedName: cssModulesGenerateScopedName,
    };
    viteConfig.css.postcss = {
      plugins: [
        postcssImport(),
        postcssNested(),
        postcssPrefixLsfClasses(),
        tailwindcss({ config: tailwindConfig }),
        autoprefixer(),
      ],
    };

    return viteConfig;
  },

  typescript: {
    reactDocgen: "react-docgen",
  },
};

export default config;
