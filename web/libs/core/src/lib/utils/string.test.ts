/**
 * Tests for string utilities (camelCase, snakeCase, kebabCase, capitalize, startCase).
 * Validates the es-toolkit/compat re-exports behave as expected.
 */

import { camelCase, capitalize, kebabCase, snakeCase, startCase } from "./string";

describe("camelCase", () => {
  it("converts space-separated words to camelCase", () => {
    expect(camelCase("foo bar")).toBe("fooBar");
    expect(camelCase("Foo Bar")).toBe("fooBar");
  });

  it("converts kebab-case and snake_case to camelCase", () => {
    expect(camelCase("foo-bar")).toBe("fooBar");
    expect(camelCase("foo_bar")).toBe("fooBar");
  });

  it("handles single word", () => {
    expect(camelCase("foo")).toBe("foo");
  });
});

describe("snakeCase", () => {
  it("converts to snake_case", () => {
    expect(snakeCase("fooBar")).toBe("foo_bar");
    expect(snakeCase("foo bar")).toBe("foo_bar");
    expect(snakeCase("foo-bar")).toBe("foo_bar");
  });
});

describe("kebabCase", () => {
  it("converts to kebab-case", () => {
    expect(kebabCase("fooBar")).toBe("foo-bar");
    expect(kebabCase("foo bar")).toBe("foo-bar");
    expect(kebabCase("foo_bar")).toBe("foo-bar");
  });
});

describe("capitalize", () => {
  it("converts first character to upper case, rest to lower", () => {
    expect(capitalize("foo")).toBe("Foo");
    expect(capitalize("FOO")).toBe("Foo");
  });
});

describe("startCase", () => {
  it("converts to space-separated words with first letter of each word capitalized", () => {
    expect(startCase("fooBar")).toBe("Foo Bar");
    expect(startCase("foo-bar")).toBe("Foo Bar");
    expect(startCase("foo_bar")).toBe("Foo Bar");
  });
});
