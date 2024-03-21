const assert = require("node:assert");
const Helpers = require("../tests/helpers");

function deepEqualWithTolerance(actual, expected, fractionDigits, message) {
  assert.deepStrictEqual(
    Helpers.convertToFixed(actual, fractionDigits),
    Helpers.convertToFixed(expected, fractionDigits),
    message,
  );
}
function notDeepEqualWithTolerance(actual, expected, fractionDigits, message) {
  assert.notDeepStrictEqual(
    Helpers.convertToFixed(actual, fractionDigits),
    Helpers.convertToFixed(expected, fractionDigits),
    message,
  );
}

module.exports = {
  deepEqualWithTolerance,
  notDeepEqualWithTolerance,
};
