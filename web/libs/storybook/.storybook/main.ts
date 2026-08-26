import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import type { ESBuildOptions, Plugin } from "vite";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import svgr from "vite-plugin-svgr";
import postcssImport from "postcss-import";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(dirname, "../../..");
const requireFromStorybook = createRequire(import.meta.url);

// Storybook evaluates this file under a virtual path like `/libs/storybook/.storybook/main.ts`,
// so static `../../../…` imports resolve to `/…` on disk. Load web-root modules by absolute path.
const tailwindConfigModule = requireFromStorybook(path.join(webRoot, "tailwind.config.js"));
const { CSS_PREFIX, cssModulesGenerateScopedName } = requireFromStorybook(
  path.join(webRoot, "vite-prefix-css-module.ts"),
) as { CSS_PREFIX: string; cssModulesGenerateScopedName: (name: string, filename: string) => string };
const { jsxJsPlugin, optimizeDepsAutomaticJsxPlugin } = requireFromStorybook(
  path.join(webRoot, "vite-lib-jsx-plugins.ts"),
) as { jsxJsPlugin: () => Plugin; optimizeDepsAutomaticJsxPlugin: () => Plugin };
const { postcssPrefixLsfClasses } = requireFromStorybook(path.join(webRoot, "postcss-prefix-lsf.cjs"));

const tailwindConfig =
  (tailwindConfigModule as { default?: typeof tailwindConfigModule }).default ?? tailwindConfigModule;

const config: StorybookConfig = {
  stories: ["../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))", "../../../apps/**/*.@(mdx|stories.@(js|jsx|ts|tsx))"],

  staticDirs: ["../public"],

  addons: ["@storybook/addon-docs", "../addons/theme-toggle/register"],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal: async (viteConfig) => {
    const root = webRoot;
    // Storybook's Vite builder defaults projectRoot to `libs/storybook`, so source under
    // `libs/ui`, `libs/editor`, etc. falls outside `root` and is served via `/@fs/...`.
    // That breaks dynamic `import()` for stories with rolldown-vite. Use the web package
    // root so all story sources resolve as normal module URLs under `/libs/...`.
    viteConfig.root = root;
    const mode = viteConfig.mode ?? "development";
    viteConfig.define = {
      ...(viteConfig.define ?? {}),
      global: "globalThis",
      "process.env.CSS_PREFIX": JSON.stringify(CSS_PREFIX),
      "process.env.BUILD_NO_SERVER": JSON.stringify(""),
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.RELEASE_NAME": JSON.stringify("storybook"),
    };
    viteConfig.esbuild = {
      ...(viteConfig.esbuild ?? {}),
      jsx: "automatic",
      jsxImportSource: "react",
    } as ESBuildOptions;
    // lightningcss (rolldown-vite's default minifier) crashes on the
    // anchor-positioning CSS in libs/ui (@position-try); use esbuild like
    // vite.config.playground.ts does.
    viteConfig.build = {
      ...(viteConfig.build ?? {}),
      cssMinify: "esbuild",
    };
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
