import * as helpers from "../helpers";

describe("helpers", () => {
  const originalMaxSafeInteger = Number.MAX_SAFE_INTEGER;

  beforeEach(() => {
    // Mock Number.MAX_SAFE_INTEGER to a smaller value for testing purposes as NodeJS supports larger integers than Web.
    Object.defineProperty(Number, "MAX_SAFE_INTEGER", {
      value: 9007199254740991,
    });
  });

  afterEach(() => {
    Object.defineProperty(Number, "MAX_SAFE_INTEGER", {
      value: originalMaxSafeInteger,
    });
  });

  describe("jsonReviverWithBigInt", () => {
    it("should return the source value if the value is a number and the source is defined and exceeds MAX_SAFE_INTEGER", () => {
      const key = "key";
      const value = 9007199254740992;
      const source = "9007199254740992";
      const context = { source };

      const result = helpers.jsonReviverWithBigInt(key, value, context);
      expect(result).toBe(source);
    });

    it("should return the source value if the value is a number and the source defined is less than -MAX_SAFE_INTEGER", () => {
      const key = "key";
      const value = -9007199254740992;
      const source = "-9007199254740992";
      const context = { source };

      const result = helpers.jsonReviverWithBigInt(key, value, context);
      expect(result).toBe(source);
    });

    it("should return the value if the value is a number and the source defined is less than or equal to MAX_SAFE_INTEGER", () => {
      const key = "key";
      const value = 9007199254740991;
      const source = 9007199254740991;
      const context = { source };

      const result = helpers.jsonReviverWithBigInt(key, value, context);
      expect(result).toBe(source);
    });
  });

  it("should return the value if the value is a number and the source defined is greater than or equal to -MAX_SAFE_INTEGER", () => {
    const key = "key";
    const value = -9007199254740991;
    const source = -9007199254740991;
    const context = { source };

    const result = helpers.jsonReviverWithBigInt(key, value, context);
    expect(result).toBe(source);
  });
});
