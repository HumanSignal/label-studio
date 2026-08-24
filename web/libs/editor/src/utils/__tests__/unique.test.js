/* global it, expect */
let guidGenerator;

beforeAll(async () => {
  const uniqueAbs = require.resolve("../unique");
  const uniqueUrl = require("node:url").pathToFileURL(uniqueAbs).href;
  const uniqueModule = await import(`${uniqueUrl}?bun_reload=${Date.now()}`);
  guidGenerator = uniqueModule.guidGenerator;
});

it("Random ID generate", () => {
  const value = guidGenerator(10);
  expect(value).toHaveLength(10);
});
