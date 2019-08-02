import { isString, isStringEmpty, isStringJSON, getUrl, toTimeString } from "../utilities";

it("Function isString works", () => {
  expect(isString("value")).toBeTruthy();
});

describe("Helper function isStringEmpty", () => {
  test("Empty", () => {
    expect(isStringEmpty("")).toBeTruthy();
  });

  test("Not empty", () => {
    expect(isStringEmpty("value")).toBeFalsy();
  });
});
