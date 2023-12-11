/** global Scenario */

/**
 * @param {Array<string>} flags
 * @param {Function} scenarios
 **/
module.exports.FFlagMatrix = function(flags, scenarios) {

  // create a matrix of all possible flag combinations
  let length = (flags.length ** 2);

  if (length === 1) length = 2;

  const flagMatrix = [];

  for (let i = 0; i < length; i++) {
    flagMatrix.push({
      ...flags.reduce((acc, flag) => ({ ...acc, [flag]: false }), {}),
    });
  }

  // update each flag combination with all possible states
  // e.g. [ { flag1: false, flag2: false }, { flag1: true, flag2: false }, ... ]
  flags.forEach((flag, index) => {
    flagMatrix.forEach((currentFlags, flagIndex) => {
      const state = Boolean((flagIndex >> index) & 1);

      flagMatrix[flagIndex][flag] = state;
    });
  });

  flagMatrix.forEach((currentFlags) => {
    this.flags = currentFlags;
    scenarios.bind(this)(currentFlags);
  });
};

/**
 * @param {string} scenarioName
 * @param {Function} scenario
 **/
module.exports.FFlagScenario = function(scenarioName, scenario) {
  if (!this.flags) throw new Error('FFlagMatrix must wrap calls to FFlagScenario');

  const variant = ` :: ${Object.entries(this.flags).map(([flag, state]) => `${flag}=${state}`).join(',')}`;

  Scenario(scenarioName + variant, scenario);
};
