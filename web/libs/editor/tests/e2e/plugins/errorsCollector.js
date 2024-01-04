const { recorder, event } = require('codeceptjs');
const Container = require('codeceptjs/lib/container');
const { assert } = require('chai');
const format = require('util').format;

const supportedHelpers = ['Playwright'];

/**
 * @typedef {boolean|RegExp|RegExp[]} ErrorsFilters
 */

/**
 * @typedef {Object} ErrorFiltersConfig
 * @property {ErrorsFilters} [ignore=false] - Should this messages be ignored?
 * @property {ErrorsFilters} [display=false] - Should this messages be displayed?
 * @property {ErrorsFilters} [interrupt=false] - Should this messages throw an exception?
 */

/**
 * @typedef {Object} errorsCollectorConfig
 * @property {boolean} [collectErrors=true] - Should uncaught errors be collected?
 * @property {boolean} [collectConsoleErrors=true] - Should console errors be collected?
 * @property {boolean} [collectConsoleWarning=true] - Should console warnings be collected?
 * @property {ErrorFiltersConfig} [filter] - Filter config for all cases
 * @property {ErrorFiltersConfig} [uncaughtErrorFilter] - Filter config for uncaught errors
 * @property {ErrorFiltersConfig} [consoleErrorFilter] - Filter config for console errors
 * @property {ErrorFiltersConfig} [consoleWarningFilter] - Filter config for console warnings
 */

const defaultConfig = {
  collectErrors: true,
  collectConsoleErrors: true,
  collectConsoleWarning: true,
  filter: {
    ignore: false,
    display: false,
    interrupt: false,
  },
  uncaughtErrorFilter: {
    // Ignore not meaningful errors
    ignore: [
      /^ResizeObserver loop limit exceeded$/,
    ],
  },
};

const UNCAUGHT_ERROR = 'uncaughtError';
const CONSOLE_ERROR = 'consoleError';
const CONSOLE_WARNING = 'consoleWarning';

const IGNORE_ACTION = 'ignore';
const DISPLAY_ACTION = 'display';
const INTERRUPT_ACTION = 'interrupt';

/**
 * This plugin can monitor three types of errors inside the browser. They are console errors, console warnings and uncaught errors.
 * Depending on the configuration it could show the problems during the tests and throw exceptions at the scenario level to make the test fail  when it is necessary.
 * @param {errorsCollectorConfig} config
 */
module.exports = function(config) {
  const helpers = Container.helpers();
  // find the first helper which is currently supported
  const helper = helpers[Object.keys(helpers).find(helper => supportedHelpers.includes(helper))];

  if (!helper) {
    console.error(`Errors collector plugin is only supported in ${supportedHelpers.join(', ')}`);
    return;
  }

  const options = Object.assign({}, defaultConfig, config);

  for (const key of ['filter', 'uncaughtErrorFilter', 'consoleErrorFilter', 'consoleWarningFilter']) {
    options[key] = Object.assign({}, defaultConfig[key], options[key]);
  }

  function ErrorCollector(page, parent) {
    this.parent = parent;
    this.page = page;
    this.run();
  }

  ErrorCollector.prototype.testMessage = function(filter, message) {
    if (typeof filter === 'boolean') return filter;
    if (filter instanceof RegExp) return filter.test(message);
    if (Array.isArray(filter)) return filter.some(f => f.test(message));
    return false;
  };

  ErrorCollector.prototype.should = function(actionType, messageType, message) {
    return this.testMessage(options.filter?.[actionType], message) || this.testMessage(options[`${messageType}Filter`]?.[actionType], message);
  };

  ErrorCollector.prototype.handleMessage = function(type, message) {
    if (this.should(IGNORE_ACTION, type, message)) return;
    if (this.should(INTERRUPT_ACTION, type, message)) {
      this.parent.addError(message);
    }
    if (this.should(DISPLAY_ACTION, type, message)) {
      console.warn(message);
    }
  };

  ErrorCollector.prototype.run = function() {
    const { page } = this;

    page.on('console', async (msg) => {
      const type = msg.type();
      let messageType;

      switch (type) {
        case 'error': {
          messageType = CONSOLE_ERROR;
          break;
        }
        case 'warning': {
          messageType = CONSOLE_WARNING;
          break;
        }
      }
      if (messageType) {
        const args = msg.args();

        for (let i = 0; i < args.length; i++) {
          args[i] = await args[i].jsonValue();
        }

        this.handleMessage(messageType, format(...args));
      }
    });
    page.on('pageerror', (exception) => {
      this.handleMessage(UNCAUGHT_ERROR, exception);
    });
  };

  function ErrorCollectors() {
    this.errors = [];
    this.collectors = {};
  }
  ErrorCollectors.prototype.addError = function(message) {
    this.errors.push(message);
  };
  ErrorCollectors.prototype.isRunningOn = function(page) {
    return !!this.collectors[page._guid];
  };
  ErrorCollectors.prototype.runErrorsCollectorOn = function(page) {
    this.collectors[page._guid] = new ErrorCollector(page, this);
  };
  ErrorCollectors.prototype.reset = function() {
    this.collectors = {};
    this.errors = [];
  };

  const errorCollectors = new ErrorCollectors();

  event.dispatcher.on(event.test.before, async () => {
    errorCollectors.reset();
  });

  event.dispatcher.on(event.step.before, async (step) => {
    if (step.name === 'amOnPage') {
      recorder.add('run collector', async () => {
        try {
          if (!errorCollectors.isRunningOn(step.helper.page)) {
            errorCollectors.runErrorsCollectorOn(step.helper.page);
          }
        } catch (err) {
          console.error(err);
        }
      });
    }
  });
  event.dispatcher.on(event.step.after, async () => {
    recorder.add('check for errors', async () => {
      for (const err of errorCollectors.errors) {
        if (err instanceof Error) {
          assert.fail(err.stack);
        } else {
          assert.fail(err);
        }
      }
    });
  });
};

module.exports.defaultConfig = defaultConfig;
