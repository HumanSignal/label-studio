import { styleToProp } from "../styles";

describe("styleToProp should works well", () => {
  it("Functional test", () => {
    const result = styleToProp("width: 60px; color: red; font-size: 10em;");
    expect(result).toEqual({
      width: "60px",
      color: "red",
      fontSize: "10em",
    });
  });

  it("Test quotes", () => {
    const result = styleToProp('background-image: url("https://example.com/image.png");');
    expect(result).toEqual({
      backgroundImage: 'url("https://example.com/image.png")',
    });
  });

  it("Default parameter = null", () => {
    expect(styleToProp()).toBeNull();
  });
});
