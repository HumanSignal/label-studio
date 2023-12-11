const Helpers = require('../tests/helpers');
const assert = require('assert');
const Helper = require('@codeceptjs/helper');

// used in Audio/Video/Paragraphs sync
const TIME_DIFF_THRESHOLD = 0.3;

class AssertionHelper extends Helper {
  assertDeepEqualWithTolerance(actual, expected, fractionDigits = 2, message) {
    assert.deepStrictEqual(
      Helpers.convertToFixed(actual, fractionDigits),
      Helpers.convertToFixed(expected, fractionDigits),
      message,
    );
  }
  assertNotDeepEqualWithTolerance(actual, expected, fractionDigits = 2, message) {
    assert.notDeepStrictEqual(
      Helpers.convertToFixed(actual, fractionDigits),
      Helpers.convertToFixed(expected, fractionDigits),
      message,
    );
  }
  /**
   * Asserts that two times are equal after sync (with some possible threshold)
   * @param {number} time1
   * @param {number} time2
   * @param {string} [message] for assertion
   */
  assertTimesInSync(time1, time2, message = '') {
    assert.equal(Math.abs(time1 - time2) < TIME_DIFF_THRESHOLD, true, message);
  }
}

module.exports = AssertionHelper;
