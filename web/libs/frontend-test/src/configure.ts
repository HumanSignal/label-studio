import { defineConfig } from "cypress";
import path from "path";
import installLogsPrinter from "cypress-terminal-report/src/installLogsPrinter";
import * as tasks from "./tasks";
import { disableChromeGPU } from "./plugins/disable_gpu";
import { coverageParallel } from "./plugins/coverage_parallel.js";

const COLLECT_COVERAGE = process.env.COLLECT_COVERAGE === "true" || process.env.COLLECT_COVERAGE === "1";

export type ConfigureOptions = {
  /** Directory of the Cypress project (e.g. `libs/editor`). Defaults to `process.cwd()`. */
  rootDir?: string;
};

/**
 * Override Cypress settings
 */
export default function (
  configModifier?: (config: Cypress.ConfigOptions) => Cypress.ConfigOptions,
  setupNodeEvents?: Cypress.EndToEndConfigOptions["setupNodeEvents"],
  options?: ConfigureOptions,
) {
  const root = options?.rootDir ?? process.cwd();
  const localPath = (p: string) => path.resolve(root, p);

  /** @type {Cypress.ConfigOptions<any>} */
  const defaultConfig: Cypress.ConfigOptions = {
    supportFolder: localPath("tests/integration/support"),
    videosFolder: localPath("output/video"),
    screenshotsFolder: localPath("output/screenshots"),
    downloadsFolder: localPath("output/downloads"),
    trashAssetsBeforeRuns: false,
    numTestsKeptInMemory: 1,
    env: {
      coverage: COLLECT_COVERAGE,
      DEFAULT_CPU_THROTTLING: process.env.DEFAULT_CPU_THROTTLING ? Number(process.env.DEFAULT_CPU_THROTTLING) : null,
      DEFAULT_NETWORK_THROTTLING: process.env.DEFAULT_NETWORK_THROTTLING || null,
    },
    e2e: {
      specPattern: localPath("tests/integration/**/*.cy.{js,jsx,ts,tsx}"),
      supportFile: localPath("tests/integration/support/e2e.ts"),
      baseUrl: "http://localhost:3000",
      viewportWidth: 1600,
      viewportHeight: 900,
      setupNodeEvents(on, config) {
        on("before:browser:launch", (browser = null, launchOptions) => {
          if (browser.name === "chrome") {
            launchOptions.args.push("--force-color-profile=srgb");
            return launchOptions;
          }
        });

        coverageParallel(on, config);
        on("task", { ...tasks });
        installLogsPrinter(on, {
          outputVerbose: false,
        });
        setupNodeEvents?.(on, config);
        disableChromeGPU(on);
        return config;
      },
    },
  };

  const finalConfig = configModifier ? configModifier(defaultConfig) : defaultConfig;

  return defineConfig(finalConfig);
}
