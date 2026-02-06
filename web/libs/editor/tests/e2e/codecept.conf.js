// turn on headless mode when running with HEADLESS=true environment variable
// HEADLESS=true npx codecept run
const headless = process.env.HEADLESS;
const port = process.env.LSF_PORT ?? 3000;
const enableCoverage = process.env.COVERAGE === "true";
const fs = require("fs");
const FRAGMENTS_PATH = "./fragments/";

module.exports.config = {
  timeout: 60 * 40, // Time out after 40 minutes
  tests: "./tests/**/*.test.js",
  output: "./output",
  helpers: {
    // Puppeteer: {
    //   url: "http://localhost:3000",
    //   show: !headless,
    //   waitForAction: headless ? 100 : 1200,
    //   windowSize: "1200x900",
    // },
    Playwright: {
      url: `http://localhost:${port}`,
      show: !headless,
      restart: "context",
      timeout: 30000,
      waitForAction: headless ? 0 : 500,
      windowSize: "1200x900",
      waitForNavigation: "domcontentloaded",
      waitForURL: "domcontentloaded",
      browser: "chromium",
      chromium: process.env.CHROMIUM_EXECUTABLE_PATH
        ? {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
            args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
          }
        : {},
      // to test date shifts because of timezone. (see date-time.test.js)
      // Paris is in +1/+2 timezone, so date with midnight (00:00)
      // will be always in previous day in ISO
      timezoneId: "Europe/Paris",
      // Explicit locale ensures <input type="date"> has a deterministic format
      // across all developer machines, preventing locale-dependent test failures
      locale: "en-US",
      trace: false,
      keepTraceForPassedTests: false,
    },
    PlaywrightAddon: {
      require: "./helpers/PlaywrightAddon.js",
    },
    MouseActions: {
      require: "./helpers/MouseActions.js",
    },
    Selection: {
      require: "./helpers/Selection.js",
    },
    Annotations: {
      require: "./helpers/Annotations.ts",
    },
    Assertion: {
      require: "./helpers/Assertion.js",
    },
  },
  include: {
    I: "./steps_file.js",
    ...Object.fromEntries(
      fs.readdirSync(FRAGMENTS_PATH).map((path) => {
        const name = path.split(".")[0];

        return [name, `${FRAGMENTS_PATH}${path}`];
      }),
    ),
  },
  bootstrap: null,
  mocha: {
    bail: true,
    reporterOptions: {
      mochaFile: "output/result.xml",
    },
  },
  name: "label-studio-frontend",
  plugins: {
    retryFailedStep: {
      enabled: true,
      minTimeout: 100,
      defaultIgnoredSteps: [
        //'amOnPage',
        //'wait*',
        "send*",
        "execute*",
        "run*",
        "have*",
      ],
    },
    // coverage: {
    //   enabled: enableCoverage,
    //   coverageDir: 'output/coverage',
    //   include: ["**/*.{js,jsx,ts,tsx}"],
    //   exclude: ["**/*.d.ts", "**/node_modules/**", "**/examples/**"],
    // },
    disableDefaultInit: {
      require: "./plugins/disableDefaultInit.js",
      enabled: true,
    },
    featureFlags: {
      require: "./plugins/featureFlags.js",
      enabled: true,
      defaultFeatureFlags: require("./setup/feature-flags"),
    },
    istanbulCoverage: {
      require: "./plugins/istanbulСoverage.js",
      enabled: enableCoverage,
      uniqueFileName: true,
      coverageDir: "../coverage",
      include: ["**/*.{js,jsx,ts,tsx}"],
      exclude: ["**/*.d.ts", "**/node_modules/**", "**/examples/**"],
      actionCoverage: {
        enabled: false,
        include: ["**/src/**"],
        exclude: ["**/common/**", "**/components/**"],
      },
    },
    errorsCollector: {
      require: "./plugins/errorsCollector.js",
      enabled: true,
      uncaughtErrorFilter: {
        interrupt: true,
        ignore: [
          // @todo: solve the problems below
          /^TypeError: Cannot read properties of null \(reading 'getBoundingClientRect'\)/,
          /The play\(\) request was interrupted/,
        ],
      },
      consoleErrorFilter: {
        // @todo switch it on to feel the pain
        display: false,
      },
    },
    stepLogsModifier: {
      require: "./plugins/stepLogsModifier.js",
      enabled: true,
      modifyStepLogs: [
        {
          stepNameMatcher: "executeScript",
          rule: "hideFunction",
        },
      ],
    },
    screenshotOnFail: {
      enabled: true,
    },
    pauseOnFail: {},
  },
  require: ["ts-node/register"],
};
