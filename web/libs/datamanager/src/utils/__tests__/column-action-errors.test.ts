import { describe, it, expect } from "bun:test";
import { normalizeColumnActionErrors } from "../column-action-errors";

describe("normalizeColumnActionErrors", () => {
  it("prefers field-level validation messages over the generic detail label", () => {
    const errors = normalizeColumnActionErrors({
      response: { detail: "Validation error", validation_errors: { value: "Enter a valid number value." } },
    });

    expect(errors).toEqual([{ label: "column-error-0", messages: ["Enter a valid number value."] }]);
  });

  it("collects multiple field messages", () => {
    const errors = normalizeColumnActionErrors({
      response: {
        validation_errors: { value: ["Enter a valid number value."], column_name: "Select a column." },
      },
    });

    expect(errors).toEqual([
      { label: "column-error-0", messages: ["Enter a valid number value."] },
      { label: "column-error-1", messages: ["Select a column."] },
    ]);
  });

  it("falls back to detail when there are no field-level errors", () => {
    const errors = normalizeColumnActionErrors({
      response: { detail: "You do not have permission.", status_code: 403 },
    });

    expect(errors).toEqual([{ label: "column-error-0", messages: ["You do not have permission."] }]);
  });

  it("reads a bare DRF error dict", () => {
    const errors = normalizeColumnActionErrors({
      response: { value: ["range(start:int) requires one start argument."] },
    });

    expect(errors).toEqual([{ label: "column-error-0", messages: ["range(start:int) requires one start argument."] }]);
  });

  it("reads a bare list body", () => {
    const errors = normalizeColumnActionErrors({ response: ["Undefined expression."] });

    expect(errors).toEqual([{ label: "column-error-0", messages: ["Undefined expression."] }]);
  });

  it("ignores raw string bodies (e.g. HTML tracebacks) and uses the generic message", () => {
    const errors = normalizeColumnActionErrors({ response: "<html><body>Traceback…</body></html>" });

    expect(errors).toEqual([
      { label: "column-error-0", messages: ["There was an error adding or updating the column."] },
    ]);
  });

  it("uses the generic message when there is no response", () => {
    expect(normalizeColumnActionErrors(undefined)).toEqual([
      { label: "column-error-0", messages: ["There was an error adding or updating the column."] },
    ]);
  });

  it("truncates very long messages", () => {
    const longMessage = "x".repeat(400);

    const [error] = normalizeColumnActionErrors({ response: { validation_errors: { value: longMessage } } });

    expect(error.messages[0]).toHaveLength(301); // 300 chars + ellipsis
    expect(error.messages[0].endsWith("…")).toBe(true);
  });
});
