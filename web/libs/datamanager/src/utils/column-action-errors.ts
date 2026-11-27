/**
 * Error handling for the "Add or Update Columns" Data Manager action (`add_data_field`).
 *
 * The action can fail with field-level validation (e.g. an invalid Number/Expression value),
 * and we want to show the user the specific reason in the dialog rather than a generic toast.
 */

const MAX_ERROR_LENGTH = 300;
const GENERIC_ERROR = "There was an error adding or updating the column.";

export type ColumnActionError = { label: string; messages: [string] };

type ApiErrorResult = {
  response?: unknown;
};

/**
 * Turn a failed column-action API result into short, user-facing messages for the dialog.
 *
 * The error envelope carries field-level messages in `validation_errors` (e.g.
 * `{ value: "Enter a valid number value." }`), while `detail` is only a generic label like
 * "Validation error" — so we prefer the specific messages and never surface the noisy envelope
 * fields (id/version/status_code). Raw string bodies (e.g. HTML 500 tracebacks) are ignored in
 * favour of the generic message so we never dump a stack trace at the user.
 */
export const normalizeColumnActionErrors = (result: ApiErrorResult | null | undefined): ColumnActionError[] => {
  const response = result?.response;
  const messages: string[] = [];

  const push = (value: unknown) => {
    if (value === null || value === undefined || typeof value === "object") return;
    const text = String(value).trim();
    if (!text) return;
    messages.push(text.length > MAX_ERROR_LENGTH ? `${text.slice(0, MAX_ERROR_LENGTH)}…` : text);
  };

  const collect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
    else push(value);
  };

  if (Array.isArray(response)) {
    collect(response);
  } else if (response && typeof response === "object") {
    const envelope = response as Record<string, unknown>;
    if (envelope.validation_errors) {
      collect(envelope.validation_errors);
    } else if (envelope.detail !== undefined || "status_code" in envelope) {
      collect(envelope.detail);
    } else {
      collect(envelope);
    }
  }

  if (messages.length === 0) push(GENERIC_ERROR);

  return messages.map((message, index) => ({ label: `column-error-${index}`, messages: [message] }));
};
