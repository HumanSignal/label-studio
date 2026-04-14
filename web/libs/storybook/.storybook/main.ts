import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AcceptedPlugin } from "postcss";
import type { StorybookConfig } from "@storybook/react-vite";
import type { ESBuildOptions, Plugin } from "vite";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import svgr from "vite-plugin-svgr";
import postcssImport from "postcss-import";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Storybook evaluates this file with a virtual `/` root, so filesystem-relative imports must use `import.meta.url` (see Makefile: `bun run storybook:serve`). */
async function loadWebTooling() {
  const base = new URL("../../../", import.meta.url).href;
  const [
    { default: tailwindConfig },
    { cssModulesGenerateScopedName, CSS_PREFIX },
    { jsxJsPlugin, optimizeDepsAutomaticJsxPlugin },
    postcssPrefixLsfModule,
  ] = await Promise.all([
    import(new URL("tailwind.config.js", base).href),
    import(new URL("vite-prefix-css-module.ts", base).href),
    import(new URL("vite-lib-jsx-plugins.ts", base).href),
    import(new URL("postcss-prefix-lsf.cjs", base).href),
  ]);
  const { postcssPrefixLsfClasses } = postcssPrefixLsfModule.default as {
    postcssPrefixLsfClasses: () => AcceptedPlugin;
  };
  return {
    tailwindConfig,
    cssModulesGenerateScopedName,
    CSS_PREFIX,
    jsxJsPlugin,
    optimizeDepsAutomaticJsxPlugin,
    postcssPrefixLsfClasses,
  };
}

const config: StorybookConfig = {
  stories: ["../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))", "../../../apps/**/*.@(mdx|stories.@(js|jsx|ts|tsx))"],

  staticDirs: ["../public"],

  addons: ["@storybook/addon-docs", "../addons/theme-toggle/register"],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  viteFinal: async (viteConfig) => {
    const {
      tailwindConfig,
      cssModulesGenerateScopedName,
      CSS_PREFIX,
      jsxJsPlugin,
      optimizeDepsAutomaticJsxPlugin,
      postcssPrefixLsfClasses,
    } = await loadWebTooling();
    const root = path.resolve(dirname, "../../..");
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
