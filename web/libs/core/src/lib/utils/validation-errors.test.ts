import { getValidationErrors, validationFieldMessages } from "./validation-errors";

describe("getValidationErrors", () => {
  it("reads nested response.validation_errors", () => {
    const result = { response: { validation_errors: { foo: ["a"] } } };
    expect(getValidationErrors(result)).toEqual({ foo: ["a"] });
  });

  it("reads top-level validation_errors", () => {
    const result = { validation_errors: { bar: "x" } };
    expect(getValidationErrors(result)).toEqual({ bar: "x" });
  });

  it("prefers nested over top-level when both exist", () => {
    const result = {
      response: { validation_errors: { a: "nested" } },
      validation_errors: { a: "top" },
    };
    expect(getValidationErrors(result)).toEqual({ a: "nested" });
  });

  it("returns undefined for missing or non-object payloads", () => {
    expect(getValidationErrors(null)).toBeUndefined();
    expect(getValidationErrors({})).toBeUndefined();
    expect(getValidationErrors({ response: { validation_errors: [] } })).toBeUndefined();
  });
});

describe("validationFieldMessages", () => {
  it("handles string field errors", () => {
    expect(validationFieldMessages({ x: "one" }, "x")).toEqual(["one"]);
  });

  it("handles string[] field errors", () => {
    expect(validationFieldMessages({ x: ["a", "b"] }, "x")).toEqual(["a", "b"]);
  });

  it("handles ErrorDetail-like objects", () => {
    expect(validationFieldMessages({ x: [{ string: "detail" }] }, "x")).toEqual(["detail"]);
  });

  it("returns empty for missing key or invalid ve", () => {
    expect(validationFieldMessages(null, "x")).toEqual([]);
    expect(validationFieldMessages({}, "x")).toEqual([]);
    expect(validationFieldMessages({ y: "n" }, "x")).toEqual([]);
  });
});
