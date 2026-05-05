/**
 * Native multi-select for the DM Form.Builder JSON-driven action dialogs.
 *
 * Renders a native ``<select multiple>`` so the form's existing field
 * registration / native change-event flow keeps working. An optional search
 * filter sits above the list to keep long user dropdowns usable.
 *
 * Paste-to-select: pasting multiple values separated by newlines, commas,
 * tabs, or spaces into the search input auto-selects all matching options and
 * clears the filter so the selections are immediately visible.
 *
 * The value sent to the backend is an array of selected option values,
 * extracted in ``Form.assembleFormData`` via ``select.selectedOptions``
 * (see Form.jsx).
 */

import { useCallback, useMemo, useState } from "react";
import { cn } from "../../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";

/** Delimiters accepted when pasting multiple values into the search input. */
const PASTE_SPLIT_RE = /[\n\r,\t ]+/;

const MultiSelect = ({
  label,
  className,
  options,
  validate,
  required,
  skip,
  labelProps,
  searchable,
  description,
  testId,
  ...props
}) => {
  const opts = options?.toJSON ? options.toJSON() : (options ?? []);

  const [filter, setFilter] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);

  const filtered = useMemo(() => {
    if (!searchable || !filter.trim()) return opts;
    const selectedSet = new Set(selectedValues);
    const q = filter.toLowerCase();
    return opts.filter(
      (o) =>
        // Always keep already-selected options in the DOM so they survive
        // filtering and Form.assembleFormData can read them via selectedOptions.
        selectedSet.has(String(o.value)) ||
        (o.label ?? "").toLowerCase().includes(q) ||
        String(o.value ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [opts, filter, searchable, selectedValues]);

  // Heuristic size: keep the box reasonable for short or empty option lists.
  const visibleRows = Math.min(8, Math.max(4, filtered.length || 4));

  // When pasting multiple values into the search box (newline / comma / tab /
  // space separated), auto-select all matching options and clear the filter so
  // the user can immediately see which entries were found.
  const handlePaste = useCallback(
    (e) => {
      const text = e.clipboardData?.getData("text") ?? "";
      const tokens = text
        .split(PASTE_SPLIT_RE)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // Single value — let the browser insert it into the search field normally.
      if (tokens.length <= 1) return;

      const matching = opts
        .filter((o) =>
          tokens.some(
            (t) =>
              (o.label ?? "").toLowerCase().includes(t) ||
              String(o.value ?? "")
                .toLowerCase()
                .includes(t),
          ),
        )
        .map((o) => String(o.value));

      // Nothing matched — let the browser insert the text normally.
      if (matching.length === 0) return;

      e.preventDefault();
      setSelectedValues((prev) => [...new Set([...prev, ...matching])]);
      setFilter(""); // clear filter so all selections are visible
    },
    [opts],
  );

  const body = (
    <FormField label={label} name={props.name} validate={validate} required={required} skip={skip} {...props}>
      {({ ref }) => (
        <div className="flex flex-col gap-tight">
          {searchable && (
            <input
              type="search"
              aria-label="Filter options"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onPaste={handlePaste}
              placeholder="Search…"
              className={[cn("form-input").mod({ size: "small" }).toClassName(), className].join(" ").trim()}
              data-testid={testId ? `${testId}-filter` : undefined}
            />
          )}
          <select
            ref={ref}
            multiple
            size={visibleRows}
            data-testid={testId}
            className={[cn("form-select").toClassName(), className].join(" ").trim()}
            style={{ height: "auto", padding: 4 }}
            {...props}
            value={selectedValues}
            onChange={(e) => setSelectedValues(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {filtered.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </FormField>
  );

  return label ? (
    <Label {...(labelProps ?? {})} text={label} description={description} required={required}>
      {body}
    </Label>
  ) : (
    body
  );
};

export default MultiSelect;
