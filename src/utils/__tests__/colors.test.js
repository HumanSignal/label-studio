import { hexToRGBA, colorToRGBA, convertToRGBA, stringToColor } from "../colors";

const defaultRGBA = "rgba(255, 255, 255, 0.1)";
const defaultHEX = {
  short: "#fff",
  long: "#ffffff",
  alpha: 0.1,
};
const randomString = {
  str: "white",
  value: "#29ccbd",
};

describe("Helper function hexToRGBA", () => {
  test("3 dig", () => {
    expect(hexToRGBA(defaultHEX.short, defaultHEX.alpha)).toEqual(defaultRGBA);
  });

  test("6 dig", () => {
    expect(hexToRGBA(defaultHEX.long, defaultHEX.alpha)).toEqual(defaultRGBA);
  });
});

describe("Helper function convertToRGBA", () => {
  test("Convert to RGBA, color", () => {
    expect(convertToRGBA(randomString.str, defaultHEX.alpha)).toEqual(defaultRGBA);
  });

  test("Convert to RGBA, HEX", () => {
    expect(convertToRGBA(defaultHEX.short, defaultHEX.alpha)).toEqual(defaultRGBA);
    expect(convertToRGBA(defaultHEX.long, defaultHEX.alpha)).toEqual(defaultRGBA);
  });
});

it("Helper function colorToRGBA", () => {
  expect(colorToRGBA(randomString.str, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("Helper function stringToColor", () => {
  expect(stringToColor(randomString.str)).toEqual(randomString.value);
});
