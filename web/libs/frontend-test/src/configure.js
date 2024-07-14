import { defineConfig } from "cypress";
import path from "path";
import { setupTypescript } from "./plugins/typescript";
import installLogsPrinter from "cypress-terminal-report/src/installLogsPrinter";
import * as tasks from "./tasks";
import { disableChromeGPU } from "./plugins/disable_gpu";
import { coverageParallel } from "./plugins/coverage_parallel.js";
import { addMatchImageSnapshotPlugin } from "cypress-image-snapshot/plugin";
import { nxE2EPreset } from "@nx/cypress/plugins/cypress-preset";

const COLLECT_COVERAGE = process.env.COLLECT_COVERAGE === "true" || process.env.COLLECT_COVERAGE === "1";
const localPath = (p) => path.resolve(process.cwd(), p);

/**
 * Override Cypress settings
 * @param {(config: Cypress.ConfigOptions) => Cypress.ConfigOptions} configModifier
 * @param {Cypress.EndToEndConfigOptions["setupNodeEvents"]?} setupNodeEvents
 */
export default function (configModifier, setupNodeEvents) {
  /** @type {Cypress.ConfigOptions<any>} */
  const defaultConfig = {
    // Assets configuration
    supportFolder: localPath("./cypress/support/"),
    videosFolder: localPath("./output/video"),
    screenshotsFolder: localPath("./output/screenshots"),
    downloadsFolder: localPath("./output/downloads"),
    fixturesFolder: localPath("./fixtures"),
    trashAssetsBeforeRuns: false, // Kills ability to run in parallel, must be off
    videoUploadOnPasses: false,
    env: {
      coverage: COLLECT_COVERAGE,
    },
    e2e: {
      ...nxE2EPreset(__filename, { cypressDir: "tests/integration" }),
      viewportWidth: 1600,
      viewportHeight: 900,
      // output config
      setupNodeEvents(on, config) {
        on("before:browser:launch", (browser = null, launchOptions) => {
          if (browser.name === "chrome") {
            // Force sRGB color profile to prevent color mismatch in CI vs local runs
            launchOptions.args.push("--force-color-profile=srgb");
            return launchOptions;
          }
        });

        addMatchImageSnapshotPlugin(on, config);

        // Allows collecting coverage
        coverageParallel(on, config);
        on("task", { ...tasks });
        // Gives a step-by-step output for failed tests in headless mode
        installLogsPrinter(on, {
          outputVerbose: false,
        });
        // Allows compiling TS files from node_modules (this package)
        setupNodeEvents?.(on, config);
        // When running in headless on the CI, there's no GPU acceleration available
        disableChromeGPU(on);
        return config;
      },
    },
  };

  const finalConfig = configModifier ? configModifier(defaultConfig) : defaultConfig;

  return defineConfig(finalConfig);
}
