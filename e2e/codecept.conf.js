const { setHeadlessWhen } = require("@codeceptjs/configure");

const headless = process.env.HEADLESS;

// turn on headless mode when running with HEADLESS=true environment variable
// export HEADLESS=true && npx codeceptjs run
setHeadlessWhen(headless);

exports.config = {
  tests: "./tests/*.test.js",
  output: "./output",
  helpers: {
    Puppeteer: {
      url: "http://localhost:8080",
      show: !headless,
      waitForAction: headless ? 100 : 300,
      windowSize: "1200x900",
      chrome: {
        defaultViewport: {
          width: 1400,
          height: 1200,
          deviceScaleFactor: 2,
        },
      },
    },
  },
  include: {
    I: "./steps_file.js",
  },
  bootstrap: null,
  mocha: {},
  name: "e2e",
  plugins: {
    retryFailedStep: {
      enabled: true,
    },
    screenshotOnFail: {
      enabled: true,
    },
  },
};

