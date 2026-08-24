/**
 * Filter toolbar for the annotations list (vertical layout).
 *
 * Layout: [ search input [x] ] [Filter ▾] [Sort ▾]
 *
 * - Search applies immediately on change with a clear button.
 * - Filter opens a popover with tri-state boolean status filters (Any / Is / Not);
 *   every change is applied instantly — no Apply step needed.
 * - Sort popover allows switching between Created at / Updated at; re-selecting
 *   the active field toggles ascending / descending order.
 */

import { useCallback, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  XIcon,
} from "@humansignal/icons";
import { Badge, Button, Dropdown, Label, Message, Tooltip, type DropdownRef } from "@humansignal/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/ui/shad/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@humansignal/ui/lib/tabs";
import { cnb as cn } from "../utils/bem";
import {
  DEFAULT_ANNOTATIONS_LIST_FILTER,
  DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS,
  hasActiveStatusFilters,
  isFilterActive,
  REVIEW_STATUS_FIELDS,
} from "./annotations-list-filter";
import type {
  AnnotationCapabilities,
  AnnotationsListBooleanFilter,
  AnnotationsListFilter as FilterState,
  AnnotationsListSortField,
  AnnotationsListSortState,
  AnnotationsListStatusField,
  AnnotationsListTypeFilter,
} from "./types";
import "./AnnotationsListFilter.prefix.css";

const ICON_SIZE = 14;

export interface AnnotationsListFilterProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  capabilities: AnnotationCapabilities;
  filteredMatchCount: number;
  totalCount: number;
  sort: AnnotationsListSortState;
  onSortChange: (sort: AnnotationsListSortState) => void;
}

const BASE_STATUS_ROWS: { field: AnnotationsListStatusField; label: string }[] = [
  { field: "draft", label: "Draft" },
  { field: "groundTruth", label: "Ground Truth" },
  { field: "skipped", label: "Skipped" },
  { field: "unresolvedComments", label: "Unresolved comments" },
  { field: "accepted", label: "Accepted" },
  { field: "rejected", label: "Rejected" },
  { field: "fixedAndAccepted", label: "Fix + Accepted" },
];

const STATUS_DISABLED_TOOLTIPS: Partial<Record<AnnotationsListStatusField, string>> = {
  draft: "Only Annotations can be drafts.",
  groundTruth: "Only Annotations can be Ground Truth.",
  skipped: "Only Annotations can be skipped.",
  unresolvedComments: "Only Annotations can have unresolved comments.",
  accepted: "Only Annotations can be accepted.",
  rejected: "Only Annotations can be rejected.",
  fixedAndAccepted: "Only Annotations can be Fix + Accepted.",
};

function getVisibleStatusRows(enableReviewStatusFilters: boolean) {
  if (enableReviewStatusFilters) return BASE_STATUS_ROWS;
  return BASE_STATUS_ROWS.filter((row) => !REVIEW_STATUS_FIELDS.includes(row.field));
}

function isReviewStatusField(field: AnnotationsListStatusField, enableReviewStatusFilters: boolean): boolean {
  return !enableReviewStatusFilters && REVIEW_STATUS_FIELDS.includes(field);
}

const TYPE_FILTER_OPTIONS: { value: AnnotationsListTypeFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "annotation", label: "Annotations Only" },
  { value: "prediction", label: "Predictions Only" },
];

const SORT_OPTIONS: { value: AnnotationsListSortField; label: string }[] = [
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "name", label: "Name" },
];

// ─── Filter tooltip helpers ────────────────────────────────────────────────

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const PRE_NOUN_LABELS: Partial<Record<AnnotationsListStatusField, string>> = {
  draft: "draft",
  groundTruth: "ground truth",
  skipped: "skipped",
  accepted: "accepted",
  rejected: "rejected",
  reviewed: "reviewed",
  fixedAndAccepted: "fix + accepted",
};

function buildFilterSubject(
  type: FilterState["type"],
  capabilities: AnnotationCapabilities,
  statusFiltersActive = false,
): string {
  const bothEnabled = capabilities.enableAnnotations && capabilities.enablePredictions;

  if (!bothEnabled) {
    return capabilities.enableAnnotations ? "annotations" : "predictions";
  }
  if (type === "annotation") return "annotations only";
  if (type === "prediction") return "predictions only";
  // Status filters only apply to annotations, so predictions are implicitly excluded when active
  if (statusFiltersActive) return "annotations";
  return "annotations and predictions";
}

function buildFilterDescription(filter: FilterState, capabilities: AnnotationCapabilities): string {
  const { statuses } = filter;
  const enableReviewStatusFilters = capabilities.enableReviewStatusFilters === true;
  const subject = buildFilterSubject(filter.type, capabilities, hasActiveStatusFilters(statuses));

  const preNoun: string[] = [];
  const notList: string[] = [];
  let unresolvedPhrase: string | null = null;

  for (const [field, label] of Object.entries(PRE_NOUN_LABELS) as [AnnotationsListStatusField, string][]) {
    if (isReviewStatusField(field, enableReviewStatusFilters)) continue;
    if (statuses[field] === true) preNoun.push(label);
    else if (statuses[field] === false) notList.push(label);
  }

  if (statuses.unresolvedComments === true) unresolvedPhrase = "with unresolved comments";
  else if (statuses.unresolvedComments === false) unresolvedPhrase = "without unresolved comments";

  let desc = "";
  if (preNoun.length > 0) desc += `${joinList(preNoun)} `;
  desc += subject;
  if (unresolvedPhrase) desc += ` ${unresolvedPhrase}`;
  if (notList.length > 0) desc += ` that are not ${joinList(notList)}`;

  return desc;
}

function buildFilterTooltip(
  filter: FilterState,
  capabilities: AnnotationCapabilities,
  filteredMatchCount: number,
  totalCount: number,
): string {
  const { statuses } = filter;
  const statusFiltersActive = hasActiveStatusFilters(statuses);
  const hasActive = statusFiltersActive || filter.type !== "all";
  if (!hasActive) return "Filter Results";

  const description = buildFilterDescription(filter, capabilities);
  let sentence = `Showing ${description}`;

  if (totalCount > 0) {
    sentence += ` — ${filteredMatchCount} of ${totalCount} results`;
  }

  sentence += ".";

  if (capabilities.enablePredictions && filter.type === "all" && statusFiltersActive) {
    sentence += " Predictions are excluded.";
  }

  return sentence;
}

function countActiveFilters(filter: FilterState, includeType: boolean, enableReviewStatusFilters: boolean): number {
  let count = includeType && filter.type !== "all" ? 1 : 0;
  for (const [field, value] of Object.entries(filter.statuses) as [
    AnnotationsListStatusField,
    AnnotationsListBooleanFilter,
  ][]) {
    if (isReviewStatusField(field, enableReviewStatusFilters)) continue;
    if (value !== null) count++;
  }
  return count;
}

// ──────────────────────────────────────────────────────────────────────────

interface TypeFilterControlProps {
  value: AnnotationsListTypeFilter;
  onChange: (value: AnnotationsListTypeFilter) => void;
}

function TypeFilterControl({ value, onChange }: TypeFilterControlProps) {
  return (
    <Label text="Result type" flat simple className={cn("annotations-list-filter").elem("typeFilter").toClassName()}>
      <Tabs value={value} variant="default" className={cn("annotations-list-filter").elem("typeTabs").toClassName()}>
        <TabsList className={cn("annotations-list-filter").elem("typeTabsList").toClassName()}>
          {TYPE_FILTER_OPTIONS.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn("annotations-list-filter").elem("typeTab").toClassName()}
              onClick={() => onChange(option.value)}
              data-testid={`annotations-list-filter-type-${option.value}`}
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </Label>
  );
}

interface BooleanFilterControlProps {
  value: AnnotationsListBooleanFilter;
  onChange: (value: AnnotationsListBooleanFilter) => void;
  testIdPrefix: string;
  disabled?: boolean;
}

const FILTER_ICON_SIZE = 12;

function BooleanFilterControl({ value, onChange, testIdPrefix, disabled = false }: BooleanFilterControlProps) {
  const tabValue = value === true ? "is" : value === false ? "not" : "any";

  return (
    <Tabs
      value={tabValue}
      variant="default"
      className={cn("annotations-list-filter").elem("booleanTabs").toClassName()}
    >
      <TabsList className={cn("annotations-list-filter").elem("booleanTabsList").toClassName()}>
        <TabsTrigger
          value="any"
          aria-label="Any"
          disabled={disabled}
          className={cn("annotations-list-filter").elem("booleanTab").mod({ any: true }).toClassName()}
          onClick={() => onChange(null)}
          data-testid={`${testIdPrefix}-any`}
        >
          <MinusIcon size={FILTER_ICON_SIZE} aria-hidden="true" weight="bold" />
        </TabsTrigger>
        <TabsTrigger
          value="is"
          aria-label="Show"
          disabled={disabled}
          className={cn("annotations-list-filter").elem("booleanTab").mod({ is: true }).toClassName()}
          onClick={() => onChange(value === true ? null : true)}
          data-testid={`${testIdPrefix}-is`}
        >
          <CheckIcon size={FILTER_ICON_SIZE} aria-hidden="true" weight="bold" />
        </TabsTrigger>
        <TabsTrigger
          value="not"
          aria-label="Hide"
          disabled={disabled}
          className={cn("annotations-list-filter").elem("booleanTab").mod({ not: true }).toClassName()}
          onClick={() => onChange(value === false ? null : false)}
          data-testid={`${testIdPrefix}-not`}
        >
          <XIcon size={FILTER_ICON_SIZE} aria-hidden="true" weight="bold" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function AnnotationsListFilter({
  filter,
  onChange,
  capabilities,
  filteredMatchCount,
  totalCount,
  sort,
  onSortChange,
}: AnnotationsListFilterProps) {
  const setQuery = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filter, query: e.target.value });
    },
    [filter, onChange],
  );

  const clearSearch = useCallback(() => {
    onChange({ ...filter, query: "" });
  }, [filter, onChange]);

  const [filterOpen, setFilterOpen] = useState(false);

  const clearFilters = useCallback(() => {
    onChange(DEFAULT_ANNOTATIONS_LIST_FILTER);
  }, [onChange]);

  const setType = useCallback(
    (type: AnnotationsListTypeFilter) => {
      const next: FilterState = { ...filter, type };
      if (type === "prediction") {
        next.statuses = { ...DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS };
      }
      onChange(next);
    },
    [filter, onChange],
  );

  const setStatus = useCallback(
    (field: AnnotationsListStatusField, value: AnnotationsListBooleanFilter) => {
      onChange({ ...filter, statuses: { ...filter.statuses, [field]: value } });
    },
    [filter, onChange],
  );

  const baseStatusRowsDisabled = filter.type === "prediction";
  const showTypeFilter = capabilities.enableAnnotations && capabilities.enablePredictions;
  const enableReviewStatusFilters = capabilities.enableReviewStatusFilters === true;
  const statusRows = getVisibleStatusRows(enableReviewStatusFilters);

  const filterActive = (showTypeFilter && filter.type !== "all") || hasActiveStatusFilters(filter.statuses);
  const filterCount = countActiveFilters(filter, showTypeFilter, enableReviewStatusFilters);
  const filterTooltip = buildFilterTooltip(filter, capabilities, filteredMatchCount, totalCount);

  const sortDropdownRef = useRef<DropdownRef>(null);

  const selectSort = useCallback(
    (field: AnnotationsListSortField) => {
      if (sort.field === field) {
        onSortChange({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
      } else {
        onSortChange({ field, direction: sort.direction });
      }
      sortDropdownRef.current?.close();
    },
    [onSortChange, sort.direction, sort.field],
  );

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort.field)?.label ?? "Created at";
  const SortDirectionIcon = sort.direction === "asc" ? SortAscendingIcon : SortDescendingIcon;
  const sortDirectionLabel = sort.direction === "asc" ? "ascending" : "descending";

  const predictionsExcludedNote =
    capabilities.enablePredictions && filterActive && filter.type === "all" && hasActiveStatusFilters(filter.statuses)
      ? " Predictions are excluded."
      : "";

  return (
    <div className={cn("annotations-list-filter").toClassName()}>
      <div className={cn("annotations-list-filter").elem("row").toClassName()}>
        <div className={cn("annotations-list-filter").elem("search").toClassName()}>
          <MagnifyingGlassIcon size={ICON_SIZE} aria-hidden="true" />
          <input
            type="text"
            value={filter.query}
            onChange={setQuery}
            placeholder="Search…"
            aria-label={
              capabilities.enablePredictions
                ? "Search annotations and predictions by results, name, email, or ID"
                : "Search annotations by results, name, email, or ID"
            }
            data-testid="annotations-list-filter-search"
            className={cn("annotations-list-filter").elem("searchInput").toClassName()}
          />
          {filter.query.length > 0 && (
            <Button
              type="button"
              variant="neutral"
              look="string"
              size="smaller"
              onClick={clearSearch}
              aria-label="Clear search"
              tooltip="Clear search"
              data-testid="annotations-list-filter-search-clear"
              className={cn("annotations-list-filter").elem("clearBtn").toClassName()}
              leading={<XIcon size={12} />}
            />
          )}
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <Tooltip title={filterTooltip} disabled={filterOpen}>
            <div className={cn("annotations-list-filter").elem("filterBtnWrapper").toClassName()}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="neutral"
                  look="string"
                  size="smaller"
                  aria-haspopup="dialog"
                  aria-expanded={filterOpen}
                  aria-label={filterTooltip}
                  data-testid="annotations-list-filter-toggle"
                  className={cn("annotations-list-filter")
                    .elem("popoverBtn")
                    .mod({ active: filterActive })
                    .toClassName()}
                  leading={<FunnelSimpleIcon size={ICON_SIZE} weight="bold" />}
                />
              </PopoverTrigger>
              {filterCount > 0 && (
                <Badge
                  look="solid"
                  size="small"
                  className={`${cn("annotations-list-filter").elem("filterBadge").toClassName()} !bg-primary-surface !text-primary-surface-content`}
                  aria-label={`${filterCount} active filter${filterCount !== 1 ? "s" : ""}`}
                >
                  {filterCount}
                </Badge>
              )}
            </div>
          </Tooltip>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={4}
            avoidCollisions={false}
            className={cn("annotations-list-filter").elem("filterPopover").toClassName()}
            aria-label="Filter options"
            data-testid="annotations-list-filter-popover"
          >
            {showTypeFilter && <TypeFilterControl value={filter.type} onChange={setType} />}
            <div
              className={cn("annotations-list-filter").elem("statuses").toClassName()}
              role="group"
              aria-label="Filter by status"
            >
              <div className={cn("annotations-list-filter").elem("statusHeader").toClassName()} aria-hidden="true">
                <span className={cn("annotations-list-filter").elem("statusHeaderSpacer").toClassName()} />
                <div className={cn("annotations-list-filter").elem("statusHeaderCols").toClassName()}>
                  <span className={cn("annotations-list-filter").elem("statusHeaderCol").toClassName()}>Any</span>
                  <span className={cn("annotations-list-filter").elem("statusHeaderCol").toClassName()}>Show</span>
                  <span className={cn("annotations-list-filter").elem("statusHeaderCol").toClassName()}>Hide</span>
                </div>
              </div>
              {statusRows.map((row) => {
                const disabled = baseStatusRowsDisabled;
                const disabledTooltip = disabled ? STATUS_DISABLED_TOOLTIPS[row.field] : undefined;
                return (
                  <Tooltip key={row.field} title={disabledTooltip} disabled={!disabledTooltip}>
                    <div
                      className={cn("annotations-list-filter").elem("statusRow").mod({ disabled }).toClassName()}
                      aria-disabled={disabled}
                    >
                      <span
                        className={cn("annotations-list-filter").elem("statusLabel").mod({ disabled }).toClassName()}
                      >
                        {row.label}
                      </span>
                      <BooleanFilterControl
                        value={filter.statuses[row.field] ?? null}
                        onChange={(value) => setStatus(row.field, value)}
                        testIdPrefix={`annotations-list-filter-status-${row.field}`}
                        disabled={disabled}
                      />
                    </div>
                  </Tooltip>
                );
              })}
            </div>
            <div className={cn("annotations-list-filter").elem("popoverFooter").toClassName()}>
              <Message
                variant={filterActive && filteredMatchCount === 0 ? "warning" : "primary"}
                size="small"
                className={filterActive && filteredMatchCount === 0 ? undefined : "!text-neutral-content-subtler"}
              >
                {filterActive && filteredMatchCount === 0
                  ? `No results to show for ${buildFilterDescription(filter, capabilities)}, out of ${totalCount} results.${predictionsExcludedNote}`
                  : filterActive
                    ? filterTooltip
                    : `Showing all ${buildFilterSubject("all", capabilities)}.`}
              </Message>
              <Button
                type="button"
                variant="negative"
                look="outlined"
                size="small"
                onClick={clearFilters}
                disabled={!isFilterActive(filter)}
                className={cn("annotations-list-filter").elem("clearFiltersBtn").toClassName()}
                data-testid="annotations-list-filter-clear"
              >
                Clear Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Dropdown.Trigger
          content={
            <div
              role="listbox"
              aria-label="Sort options"
              data-testid="annotations-list-sort-popover"
              className="p-tight flex flex-col gap-tighter"
            >
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sort.field === opt.value;
                const TrailingIcon = isSelected ? (sort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon) : null;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectSort(opt.value)}
                    data-testid={`annotations-list-sort-${opt.value}`}
                    className={`flex items-center gap-tight w-full text-left px-tight py-tight text-body-small rounded-smaller whitespace-nowrap cursor-pointer outline-none transition-colors duration-150 ease-out border-none font-[inherit] focus-visible:bg-primary-emphasis-subtle ${isSelected ? "bg-primary-emphasis text-primary-content font-medium hover:bg-primary-emphasis" : "text-neutral-content-subtle hover:bg-primary-emphasis-subtle"}`}
                  >
                    {opt.label}
                    {TrailingIcon && <TrailingIcon size={ICON_SIZE} className="ml-auto shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          }
          dropdown={sortDropdownRef}
          alignment="bottom-right"
        >
          <div className={cn("annotations-list-filter").elem("sortBtnWrapper").toClassName()}>
            <Button
              type="button"
              variant="neutral"
              look="string"
              size="smaller"
              aria-haspopup="listbox"
              aria-label={`Sort by ${currentSortLabel}, ${sortDirectionLabel}`}
              data-testid="annotations-list-sort-toggle"
              className={cn("annotations-list-filter").elem("popoverBtn").toClassName()}
              leading={<SortDirectionIcon size={ICON_SIZE} weight="bold" />}
            />
          </div>
        </Dropdown.Trigger>
      </div>
    </div>
  );
}
