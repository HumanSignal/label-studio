import { prettyDate } from "../date";

describe("Helper function prettyDate", () => {
  test("Undefined", () => {
    expect(prettyDate(undefined)).toBeUndefined();
    expect(prettyDate(null)).toBeUndefined();
    expect(prettyDate(123)).toBeUndefined();
  });
});
