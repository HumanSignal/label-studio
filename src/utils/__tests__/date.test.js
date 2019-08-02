import { prettyDate, msToHMS } from "../date";

describe("Helper function prettyDate", () => {
  test("Undefined", () => {
    expect(prettyDate(undefined)).toBeUndefined();
    expect(prettyDate(null)).toBeUndefined();
    expect(prettyDate(123)).toBeUndefined();
  });

  test("Time Zone Moscow", () => {
    expect(prettyDate(new Date().toISOString())).toBe("3 hours ago");
  });
});

describe("Helper function msToHMS", () => {
  test("Correct", () => {
    expect(msToHMS(10000)).toBe("0:0:10");
  });
});
