import { prettyDate } from "../date";

it("Date is undefined", () => {
  expect(prettyDate(undefined)).toBeUndefined();
});

it("Date is null", () => {
  expect(prettyDate(null)).toBeUndefined();
});

it("Date is NaN", () => {
  expect(prettyDate(123)).toBeUndefined();
});
