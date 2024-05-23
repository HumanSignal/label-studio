/* global describe, test, expect */
import Canvas from "../canvas";

const svgs = {
  simple: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="2"%3E',
    '%3Ctext x="0" y="11" style="font-size: 9.5px; font-weight: bold; font-family: Monaco"%3E',
    "Test Label",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  complex: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="2"%3E',
    '%3Ctext x="0" y="11" style="font-size: 9.5px; font-weight: bold; font-family: Monaco"%3E',
    "A&lt;/text%3E B",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  score: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="28"%3E',
    '%3Crect x="0" y="0" rx="2" ry="2" width="24" height="14" style="fill:%237ca91f;opacity:0.5" /%3E',
    '%3Ctext x="3" y="10" style="font-size: 8px; font-family: Monaco"%3E0.60%3C/text%3E',
    '%3Ctext x="26" y="11" style="font-size: 9.5px; font-weight: bold; font-family: Monaco"%3E',
    "Test Label",
    "%3C/text%3E%3C/svg%3E'",
  ].join(""),
  empty: [
    "'data:image/svg+xml,",
    '%3Csvg xmlns="http://www.w3.org/2000/svg" height="16" width="0"%3E',
    "%3C/svg%3E'",
  ].join(""),
};

describe("Helper function labelToSVG", () => {
  test("Simple label", () => {
    expect(Canvas.labelToSVG({ label: "Test Label" })).toBe(svgs.simple);
  });

  test("Complex label", () => {
    // labels will be already escaped
    expect(Canvas.labelToSVG({ label: "A&lt;/text>   B" })).toBe(svgs.complex);
  });

  test("With score", () => {
    expect(Canvas.labelToSVG({ label: "Test Label", score: 0.6 })).toBe(svgs.score);
  });

  test("No label & score", () => {
    expect(Canvas.labelToSVG({})).toBe(svgs.empty);
  });
});
