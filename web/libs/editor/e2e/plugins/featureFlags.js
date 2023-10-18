const { recorder, event } = require('codeceptjs');
const Container = require('codeceptjs/lib/container');

const defaultConfig = {
  defaultFeatureFlags: {},
};

const supportedHelpers = ['Playwright'];

/**
 * This plugin will listen for setting feature flags and apply them at the moment of page loading.
 * In this case set feature flags will affect the whole code including  models initialization,
 * and other similar parts that will run on the the scripts load.
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
    console.error(`Feature flags is only supported in ${supportedHelpers.join(', ')}`);
    return;
  }

  const options = Object.assign({}, defaultConfig, helper.options, config);

  if (options.enable) return;

  let defaultValue;
  let ffs = {};

  function hasStepName(name, step) {
    return step && (name === step.name || hasStepName(name, step.metaStep));
  }

  event.dispatcher.on(event.test.before, async () => {
    ffs = { ...options.defaultFeatureFlags };
  });

  event.dispatcher.on(event.step.before, async (step) => {
    if (hasStepName('amOnPage', step)) {
      recorder.add('set feature flags', async () => {
        try {
          helper.page.once('requestfinished',
            () => {
              helper.page.evaluate((config) => {
                if (!window.APP_SETTINGS) window.APP_SETTINGS = {};
                if (!window.APP_SETTINGS.feature_flags) window.APP_SETTINGS.feature_flags = {};
                window.APP_SETTINGS.feature_flags = {
                  ...window.APP_SETTINGS.feature_flags,
                  ...config.feature_flags,
                };
                if (typeof config.feature_flags_default_value === 'boolean') {
                  window.APP_SETTINGS.feature_flags_default_value = config.feature_flags_default_value;
                }
              }, { feature_flags: ffs, feature_flags_default_value: defaultValue });
            },
          );
        } catch (err) {
          console.error(err);
        }
      });
    }
    if (hasStepName('setFeatureFlags', step)) {
      recorder.add('remember feature flags', async () => {
        try {
          ffs = {
            ...ffs,
            ...step.args[1],
          };
        } catch (err) {
          console.error(err);
        }
      });
    }
    if (hasStepName('setFeatureFlagsDefaultValue', step)) {
      recorder.add('remember feature flags default value', async () => {
        try {
          defaultValue = step.args[1];
        } catch (err) {
          console.error(err);
        }
      });
    }
  });
};
