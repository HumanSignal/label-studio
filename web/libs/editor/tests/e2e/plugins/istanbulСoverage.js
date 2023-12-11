/* global global */

const fs = require('fs');
const path = require('path');
const TestExclude = require('test-exclude');
const { recorder, event, output } = require('codeceptjs');
const Container = require('codeceptjs/lib/container');
const { clearString } = require('codeceptjs/lib/utils');

function hashCode(str) {
  let hash = 0;

  if (str.length === 0) {
    return hash + '';
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);

    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

const defaultConfig = {
  coverageDir: 'output/coverage',
  actionCoverage: false,
  uniqueFileName: true,
};

const defaultActionCoverageConfig = {
  enabled: true,
  beginActionName: 'performActionBegin',
  endActionName: 'performActionEnd',
  coverageDir: 'output/actionCoverage',
  include: true,
  exclude: false,
};

const supportedHelpers = ['Puppeteer', 'Playwright'];

function buildFileName(test, uniqueFileName) {
  let fileName = clearString(test.title);
  const originalName = fileName;

  // This prevent data driven to be included in the failed screenshot file name
  if (fileName.indexOf('{') !== -1) {
    fileName = fileName.substr(0, fileName.indexOf('{') - 3).trim();
  }

  if (test.ctx && test.ctx.test && test.ctx.test.type === 'hook') {
    fileName = clearString(`${test.title}_${test.ctx.test.title}`);
  }

  if (uniqueFileName) {
    const uuid = hashCode(originalName);

    fileName = `${fileName.substring(0, 15)}_${uuid}.coverage.json`;
  } else {
    fileName = `${fileName}.coverage.json`;
  }

  return fileName;
}

function prepareActionStepConfig(actionCoverageConfig) {
  const config = typeof actionCoverageConfig === 'boolean' ? {
    enabled: actionCoverageConfig,
  } : actionCoverageConfig;

  return Object.assign({}, defaultActionCoverageConfig, config );
}

/**
 * Dumps code coverage from Playwright/Puppeteer after every test.
 *
 * #### Configuration
 *
 *
 * ```js
 * plugins: {
 *    istanbulCoverage: {
 *      require: "./path/to/istanbulCoverage"
 *      enabled: true
 *    }
 * }
 * ```
 *
 * Possible config options:
 *
 * * `coverageDir`: directory to dump coverage files
 * * `uniqueFileName`: generate a unique filename by adding uuid
 */
module.exports = function(config) {
  const helpers = Container.helpers();
  let helper;

  for (const helperName of supportedHelpers) {
    if (Object.keys(helpers).indexOf(helperName) > -1) {
      helper = helpers[helperName];
    }
  }

  if (!helper) {
    console.error('Coverage is only supported in Puppeteer, Playwright');
    return;
  }

  const options = Object.assign(defaultConfig, helper.options, config);

  options.actionCoverage = prepareActionStepConfig(options.actionCoverage);

  const excludeTester = new TestExclude({
    ...options.actionCoverage,
    cwd: path.resolve('../'),
  });

  let lastCoverages = {};
  let lastActionKeys = new Set();
  let actionCoverages = {};

  const actionsStack = [];
  let prevActionsStack = [];

  const performActionBegin = (name) => {
    actionsStack.push(name);
  };

  const performActionEnd = () => {
    actionsStack.pop();
  };

  if (options.actionCoverage.enabled) {
    global[options.actionCoverage.beginActionName] = performActionBegin;
    global[options.actionCoverage.endActionName] = performActionEnd;
  } else {
    global[options.actionCoverage.beginActionName] = global[options.actionCoverage.endActionName] = ()=>{};
  }

  const getCoverage = async () => {
    const coverageInfo = await helper.page.evaluate(() => {
      const coverageInfo = window.__coverage__;

      return coverageInfo;
    });

    return coverageInfo;
  };

  function hasActionChanges() {
    return actionsStack.length !== prevActionsStack.length || actionsStack.some((val, key) => val !== prevActionsStack[key]);
  }

  function filterActionCoverage(actionCoverage) {
    return Object.fromEntries(Object.entries(actionCoverage).filter(([path]) => excludeTester.shouldInstrument(path)));
  }
  async function collectLastCoverage(actionKeys, endOfTest = false) {
    const coverageInfo = await getCoverage();

    if (!coverageInfo) return {};
    const actionCoverageInfo = filterActionCoverage(coverageInfo);

    actionKeys.forEach(actionKey => {
      if (!lastCoverages[actionKey]) {
        lastCoverages[actionKey] = actionCoverageInfo;
      }
    });

    for (const lastActionKey of lastActionKeys) {
      if (endOfTest || actionKeys.indexOf(lastActionKey) === -1) {
        const additionalCoverage = subCoverage(actionCoverageInfo, lastCoverages[lastActionKey]);

        if (!actionCoverages[lastActionKey]) {
          actionCoverages[lastActionKey] = additionalCoverage;
        } else {
          actionCoverages[lastActionKey] = addCoverage(actionCoverages[lastActionKey], additionalCoverage);
        }

        lastCoverages[lastActionKey] = undefined;
        delete lastCoverages[lastActionKey];
      }
    }

    lastActionKeys = [...actionKeys];

    return coverageInfo;
  }

  function operateCoverage(aCoverage, bCoverage, op) {
    const resultCoverage = {};

    for (const [filePath, aFileCoverage] of Object.entries(aCoverage)) {
      const bFileCoverage = bCoverage[filePath];
      const resultFileCoverage = { ...aFileCoverage, s: {}, f: {}, b: {} };

      for (const [key, value] of Object.entries(aFileCoverage.s)) {
        resultFileCoverage.s[key] = op(value, bFileCoverage.s[key]);
      }
      for (const [key, value] of Object.entries(aFileCoverage.f)) {
        resultFileCoverage.f[key] = op(value, bFileCoverage.f[key]);
      }
      for (const [key, values] of Object.entries(aFileCoverage.b)) {
        resultFileCoverage.b[key] = values.map((val, idx)=> op(val, bFileCoverage.b[key][idx]));
      }
      resultCoverage[filePath] = resultFileCoverage;
    }
    return resultCoverage;
  }

  function subCoverage(aCoverage, bCoverage) {
    return operateCoverage(aCoverage, bCoverage, (a,b) => a - b);
  }
  function addCoverage(aCoverage, bCoverage) {
    return operateCoverage(aCoverage, bCoverage, (a,b) => a + b);
  }

  event.dispatcher.on(event.all.before, async () => {
    output.debug('*** Collecting istanbul coverage for tests ****');
    if (!options.actionCoverage.enabled) return;
    actionCoverages = {};
  });

  event.dispatcher.on(event.all.after, async () => {
    if (!options.actionCoverage.enabled) return;
    recorder.add(
      'saving action coverage',
      async () => {
        try {
          const coverageDir = path.resolve(
            process.cwd(),
            options.actionCoverage.coverageDir,
          );

          if (!fs.existsSync(coverageDir)) {
            fs.mkdirSync(coverageDir, { recursive: true });
          }

          for (const [actionName, coverage] of Object.entries(actionCoverages)) {
            const coveragePath = path.resolve(
              coverageDir,
              actionName+'.coverage.json',
            );

            output.print(`writing ${coveragePath}`);
            fs.writeFileSync(coveragePath, JSON.stringify(coverage));
          }
        } catch (err) {
          console.error(err);
        }
      },
      true,
    );
  });

  event.dispatcher.on(event.test.before, async () => {
    if (!options.actionCoverage.enabled) return;
    lastCoverages = {};
    lastActionKeys = new Set();
    prevActionsStack = [];
  });
  // Save coverage data after every test run
  event.dispatcher.on(event.test.after, async (test) => {
    recorder.add(
      'saving coverage',
      async () => {
        try {
          const coverageInfo = await collectLastCoverage(actionsStack, true);

          const coverageDir = path.resolve(
            process.cwd(),
            options.coverageDir,
          );

          if (!fs.existsSync(coverageDir)) {
            fs.mkdirSync(coverageDir, { recursive: true });
          }

          const coveragePath = path.resolve(
            coverageDir,
            buildFileName(test, options.uniqueFileName),
          );

          output.print(`writing ${coveragePath}`);
          fs.writeFileSync(coveragePath, JSON.stringify(coverageInfo));
        } catch (err) {
          console.error(err);
        }
      },
      true,
    );
  });

  event.dispatcher.on(event.step.before, async () => {
    if (!options.actionCoverage.enabled) return;
    if (!hasActionChanges()) return;
    prevActionsStack = [...actionsStack];
    const stack = [...actionsStack];

    recorder.add('collect last coverage', async () => {
      try {
        await collectLastCoverage(stack);
      } catch (err) {
        console.error(err);
      }
    });
  });
};
