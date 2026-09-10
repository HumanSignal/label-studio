import { FunnelSimpleIcon } from "@humansignal/icons";
import { Button } from "../button/button";
import { Select } from "../select/select";
import { FilterPill } from "./filter-pill";
import styles from "./filter-shell.module.css";
import type { FilterShellProps } from "./types";

export const FilterShell = ({
  filters,
  addFilter,
  onReset,
  resetLabel = "Reset",
  "aria-label": ariaLabel = "Filters",
}: FilterShellProps) => {
  const addFilterOptions =
    addFilter?.options.map(({ id, label, group }) => ({
      value: id,
      label,
      group,
    })) ?? [];

  return (
    <div role="region" aria-label={ariaLabel} className={styles.shell}>
      <div className={styles.filters}>
        {addFilter && (
          <Select
            options={addFilterOptions}
            searchable
            groupBy="group"
            isInline
            placeholder="Add Filter"
            searchPlaceholder={addFilter.searchPlaceholder ?? "Search filters"}
            disabled={addFilter.disabled || addFilterOptions.length === 0}
            dataTestid="filter-shell-add-filter"
            triggerClassName={styles.addFilterTrigger}
            triggerProps={{ "aria-label": "Add Filter" }}
            value={null}
            renderSelected={() => (
              <span className={styles.addFilterLabel}>
                <FunnelSimpleIcon size={20} aria-hidden="true" className={styles.addFilterIcon} />
                Add Filter
              </span>
            )}
            onChange={(id) => addFilter.onSelect(id)}
          />
        )}
        {filters.map((filter) => (
          <FilterPill key={filter.id} {...filter} />
        ))}
        {onReset && (
          <Button
            type="button"
            look="string"
            variant="neutral"
            size="small"
            data-testid="filter-shell-reset"
            className={styles.resetButton}
            onClick={onReset}
          >
            {resetLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
