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

it("HEX to RGBA correct work, 3 dig", () => {
  expect(hexToRGBA(defaultHEX.short, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("HEX to RGBA correct work, 6 dig", () => {
  expect(hexToRGBA(defaultHEX.long, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("Convert color to RGBA", () => {
  expect(colorToRGBA(randomString.str, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("Convert to RGBA, color", () => {
  expect(convertToRGBA(randomString.str, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("Convert to RGBA, HEX", () => {
  expect(convertToRGBA(defaultHEX.short, defaultHEX.alpha)).toEqual(defaultRGBA);
  expect(convertToRGBA(defaultHEX.long, defaultHEX.alpha)).toEqual(defaultRGBA);
});

it("Convert random string to color", () => {
  expect(stringToColor(randomString.str)).toEqual(randomString.value);
});
