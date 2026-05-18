import { Badge } from "@humansignal/ui";
import { observer } from "mobx-react";
import { useCallback, useMemo, useState } from "react";

const SPLIT_RE = /[\n,;\t ]+/;

function stripQuotes(token) {
  if (token.length >= 2) {
    const first = token[0];
    const last = token[token.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return token.slice(1, -1).trim();
    }
  }
  return token;
}

/**
 * Parse a textarea string into a list of values for the `in_list` / `not_in_list`
 * operators. Splits on newline / comma / semicolon / tab / one-or-more spaces,
 * trims, strips surrounding quotes, dedupes (case-sensitive), and — for Number
 * type — drops non-numeric tokens (lenient policy).
 *
 * Returns `{ valid, invalid }` so the UI can surface a count of skipped tokens.
 */
export function parseListInput(text, type) {
  const rawTokens = (text ?? "").split(SPLIT_RE);
  const seen = new Set();
  const valid = [];
  const invalid = [];

  for (const rawToken of rawTokens) {
    const trimmed = rawToken.trim();
    if (!trimmed) continue;
    const cleaned = stripQuotes(trimmed);
    if (!cleaned) continue;

    if (type === "number") {
      const num = Number(cleaned);
      if (Number.isFinite(num)) {
        if (!seen.has(num)) {
          seen.add(num);
          valid.push(num);
        }
      } else {
        invalid.push(cleaned);
      }
    } else if (!seen.has(cleaned)) {
      seen.add(cleaned);
      valid.push(cleaned);
    }
  }

  return { valid, invalid };
}

function joinList(value) {
  return Array.isArray(value) ? value.join("\n") : (value ?? "");
}

export const ListInput = observer(({ value, onChange, type = "string", placeholder, disabled }) => {
  // Local text state — the textarea is the source of truth. The parent receives
  // only the parsed valid array.
  const [text, setText] = useState(() => joinList(value));

  const { valid, invalid } = useMemo(() => parseListInput(text, type), [text, type]);

  const handleChange = useCallback(
    (event) => {
      const next = event.target.value;
      setText(next);
      const { valid: nextValid } = parseListInput(next, type);
      // Always pass an array — `in_list`/`not_in_list` require a JSON array on the BE,
      // and `isValidFilter` keeps empty arrays from triggering a PATCH (see save() in
      // tab_filter.js). Sending null would force-save a 400 from the FilterSerializer.
      onChange(nextValid);
    },
    [onChange, type],
  );

  return (
    <div className="flex w-full flex-col gap-1">
      <textarea
        rows={3}
        value={text}
        onChange={handleChange}
        placeholder={placeholder ?? "Paste values separated by newline, comma, or space"}
        disabled={disabled}
        className="w-full min-w-[200px] resize-y rounded border border-neutral-border bg-neutral-background px-2 py-1 text-xs"
        data-testid="list-input-textarea"
        aria-label="List of filter values"
      />
      <div className="flex flex-wrap items-center gap-1" data-testid="list-input-summary">
        <Badge variant="neutral" size="small">{`${valid.length} valid`}</Badge>
        {invalid.length > 0 && (
          <>
            <Badge variant="warning" size="small">{`${invalid.length} invalid`}</Badge>
            <span
              className="font-mono text-xs text-neutral-content-subtle"
              data-testid="list-input-invalid-tokens"
              title={invalid.join(", ")}
            >
              {invalid.slice(0, 5).join(", ")}
              {invalid.length > 5 ? ` …+${invalid.length - 5}` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
});
