const { event } = require('codeceptjs');

const REPLACE_ARGS_RULE = 'replaceArgs';
const HIDE_FUNCTION_RULE = 'hideFunction';

const RULES = {
  REPLACE_ARGS_RULE,
  HIDE_FUNCTION_RULE,
};

/**
 * @typedef  stepNameMatcher
 *
 */

/**
 * @typedef {object} modifyStepConfig
 * @property {boolean|string|string[]|RegExp|RegExp[]} [stepNameMatcher=true] - affected steps matcher
 * @property {Function|'replaceArgs'|'hideFunction'} [rule=REPLACE_RULE] - replacing rule
 * @property {any[]} [params]
 */

/**
 * @typedef {Object} stepLogsModifierConfig
 * @property {modifyStepConfig[]} [modifyStepLogs] - List of step modifiers
 */

/**
 * @type {stepLogsModifierConfig}
 */
const defaultConfig = {
  modifyStepLogs: [{
    stepNameMatcher: true,
    rule: REPLACE_ARGS_RULE,
    params: ['[args]'],
  }],
};

/**
 * This plugin can modify step logs.
 * The main goal is making step logs more compact.
 * @param {stepLogsModifierConfig} config
 */
module.exports = function(config) {
  const options = Object.assign({}, defaultConfig, config);

  const RULES = {
    [REPLACE_ARGS_RULE](step, replacer) {
      step.toString = replaceArgsStepToString.bind(step, replacer);
      step.toCode = replaceArgsStepToCode.bind(step, replacer);
    },
    [HIDE_FUNCTION_RULE](step) {
      const functionName = step.args?.[0]?.name || '<anonymous>';

      step.toString = replaceArgsStepToString.bind(step, functionName);
      step.toCode = replaceArgsStepToCode.bind(step, functionName);
    },
  };

  function replaceArgsStepToString(replacer) {
    return `${this.prefix}${this.actor} ${this.humanize()} ${replacer}${this.suffix}`;
  }
  function replaceArgsStepToCode(replacer) {
    return `${this.prefix}${this.actor}.${this.name}(${replacer})${this.suffix}`;
  }

  function testStep(matcher, stepName) {
    if (typeof matcher === 'boolean') return matcher;
    if (typeof matcher === 'string') return matcher === stepName;
    if (matcher instanceof RegExp) return matcher.test(stepName);
    if (Array.isArray(matcher)) return matcher.some(f => testStep(f, stepName));
    return false;
  }

  function modifyStep(step) {
    if (step.metaStep) {
      modifyStep(step.metaStep);
    }
    for (const modifierParams of options.modifyStepLogs) {
      if (testStep(modifierParams.stepNameMatcher, step.name)) {
        if (typeof modifierParams.rule === 'function') {
          modifierParams.rule(step);
        } else {
          if (RULES[modifierParams.rule]) {
            RULES[modifierParams.rule](step, ...(modifierParams.params||[]));
          } else {
            console.error('There is no step modifier rule called `', modifierParams.rule,'`');
          }
        }
      }
    }
  }

  event.dispatcher.on(event.step.before, modifyStep);
};

module.exports.defaultConfig = defaultConfig;
module.exports.RULES = RULES;