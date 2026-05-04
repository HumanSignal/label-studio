/**
 * Native multi-select for the DM Form.Builder JSON-driven action dialogs.
 *
 * Renders a native ``<select multiple>`` so the form's existing field
 * registration / native change-event flow keeps working. An optional search
 * filter sits above the list to keep long user dropdowns usable.
 *
 * The value sent to the backend is an array of selected option values,
 * extracted in ``Form.assembleFormData`` via ``select.selectedOptions``
 * (see Form.jsx).
 */

import { useMemo, useState } from "react";
import { cn } from "../../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";

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
  const filtered = useMemo(() => {
    if (!searchable || !filter.trim()) return opts;
    const q = filter.toLowerCase();
    return opts.filter(
      (o) =>
        (o.label ?? "").toLowerCase().includes(q) ||
        String(o.value ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [opts, filter, searchable]);

  // Heuristic size: keep the box reasonable for short or empty option lists.
  const visibleRows = Math.min(8, Math.max(4, filtered.length || 4));

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
