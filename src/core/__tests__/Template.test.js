import { _index } from "../Template";

const objToInd = { a: { b: { c: 10 } } };

it("Template function index", () => {
  expect(_index(objToInd, "a.b.c")).toBe(10);
});

/**
 *  Works with both strings and lists
 */
it("Template function index", () => {
  expect(_index(objToInd, ["a", "b", "c"])).toBe(10);
});

/**
 * Setter-mode - third argument (possibly poor form)
 */
it("Template function index", () => {
  expect(_index(objToInd, "a.b.c", 123)).toBe(123);
});
