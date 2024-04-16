const { recorder, event } = require('codeceptjs');
const Container = require('codeceptjs/lib/container');

const defaultConfig = {
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
    console.error(`Prevent LSF init is only supported in ${supportedHelpers.join(', ')}`);
    return;
  }

  const options = Object.assign({}, defaultConfig, helper.options, config);

  if (options.enable) return;

  let defaultValue;
  let ffs = {};

  function hasStepName(name, step) {
    return step && (name === step.name || hasStepName(name, step.metaStep));
  }

  event.dispatcher.on(event.step.before, async (step) => {
    if (hasStepName('amOnPage', step)) {
      recorder.add('set feature flags', async () => {
        try {
          helper.page.once('requestfinished',
            () => {
              helper.page.evaluate(() => {
                window.DISABLE_DEFAULT_LSF_INIT = true;
              });
            },
          );
        } catch (err) {
          console.error(err);
        }
      });
    }
  });
};
