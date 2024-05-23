/* global it, expect */
import { guidGenerator } from "../unique";

it("Random ID generate", () => {
  expect(guidGenerator(10)).toHaveLength(10);
});
