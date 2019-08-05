import { isString, isStringEmpty, isStringJSON, getUrl, toTimeString } from "../utilities";

/**
 * isString
 */
it("Function isString works", () => {
  expect(isString("value")).toBeTruthy();
});

/**
 * isStringEmpty
 */
describe("Helper function isStringEmpty", () => {
  test("Empty", () => {
    expect(isStringEmpty("")).toBeTruthy();
  });

  test("Not string", () => {
    expect(isStringEmpty(123)).toBeFalsy();
  });

  test("Not empty", () => {
    expect(isStringEmpty("value")).toBeFalsy();
  });
});

/**
 * isStringJSON
 */
describe("Helper function isStrinJSON", () => {
  test("JSON", () => {
    expect(isStringJSON(`{"test": "value"}`)).toBeTruthy();
  });

  test("String isn't JSON", () => {
    expect(isStringJSON("value")).toBeFalsy();
  });

  test("Number", () => {
    expect(isStringJSON(1)).toBeFalsy();
  });

  test("Null", () => {
    expect(isStringJSON(null)).toBeFalsy();
  });
});

/**
 * getUrl
 */
describe("Helper function getUrl", () => {
  test("Correct https", () => {
    expect(getUrl(0, "https://heartex.net testing value")).toBe("https://heartex.net");
  });

  test("Correct http", () => {
    expect(getUrl(0, "http://heartex.net testing value")).toBe("http://heartex.net");
  });

  test("Correct wwww", () => {
    expect(getUrl(0, "www.heartex.net testing value")).toBe("www.heartex.net");
  });

  test("Not correct", () => {
    expect(getUrl(2, "https://heartex.net testing value")).toBe("");
  });
});

/**
 * toTimeString
 */
describe("Helper function toTimeString", () => {
  test("Correct", () => {
    expect(toTimeString(5000)).toBe("00:00:05");
  });
});
