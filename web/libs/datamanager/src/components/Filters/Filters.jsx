import { inject } from "mobx-react";
import React from "react";
import { cn } from "../../utils/bem";
import { Button } from "@humansignal/ui";
import { FilterLine } from "./FilterLine/FilterLine";
import { IconChevronRight, IconPlus, IconCopyOutline, IconClipboardCheck } from "@humansignal/icons";
import { getRecentFilterFields, addRecentFilterField, updateRecentFilterField } from "./filter-recents";
import "./Filters.scss";

const injector = inject(({ store }) => ({
  store,
  views: store.viewsStore,
  currentView: store.currentView,
  filters: store.currentView?.currentFilters ?? [],
  projectId: store.SDK?.projectId,
}));

export const Filters = injector(({ store, views, currentView, filters, projectId }) => {
  const { sidebarEnabled } = views;
  const [recentFieldIds, setRecentFieldIds] = React.useState(() => getRecentFilterFields(projectId));
  const [copyFeedback, setCopyFeedback] = React.useState(false);
  const [pasteFeedback, setPasteFeedback] = React.useState(false);

  // Saves the departing column to recents AND moves it to the top of the list.
  // Called when the user switches to a non-recent column — the departing column
  // becomes the most recently used one.
  const handleFieldSelect = React.useCallback(
    (filterTypeId, operator, value) => {
      addRecentFilterField(projectId, filterTypeId, operator, value);
      setRecentFieldIds(getRecentFilterFields(projectId));
    },
    [projectId],
  );

  // Saves the departing column's latest state WITHOUT reordering the recents list.
  // Called when the user picks a recent column — we need to persist the current
  // column's operator/value, but switching to a recent item should not reshuffle
  // the list the user just interacted with.
  const handleFieldUpdate = React.useCallback(
    (filterTypeId, operator, value) => {
      updateRecentFilterField(projectId, filterTypeId, operator, value);
      setRecentFieldIds(getRecentFilterFields(projectId));
    },
    [projectId],
  );

  // Build the dropdown options list: "Recent" header + recent items + separator + grouped columns.
  // Recent items carry _recentOperator/_recentValue so FilterLine can fully restore the state.
  const fields = React.useMemo(() => {
    const groups = currentView.availableFilters.reduce((res, filter) => {
      const target = filter.field.target;
      const groupTitle = target
        .split("_")
        .map((s) =>
          s
            .split("")
            .map((c, i) => (i === 0 ? c.toUpperCase() : c))
            .join(""),
        )
        .join(" ");

      const group = res[target] ?? {
        id: target,
        title: groupTitle,
        options: [],
      };

      group.options.push({
        value: filter.id,
        title: filter.field.title,
        original: filter,
        disabled: filter.field.disabled,
      });

      return { ...res, [target]: group };
    }, {});

    const groupValues = Object.values(groups);

    if (recentFieldIds.length > 0) {
      const allFiltersById = new Map(currentView.availableFilters.map((f) => [f.id, f]));
      const recentOptions = recentFieldIds
        .map((entry) => {
          const filter = allFiltersById.get(entry.id);
          return filter ? { entry, filter } : null;
        })
        .filter(Boolean)
        .map(({ entry, filter }) => ({
          value: filter.id,
          title: filter.field.title,
          original: filter,
          disabled: filter.field.disabled,
          _isRecent: true,
          _recentOperator: entry.operator,
          _recentValue: entry.value,
        }));

      if (recentOptions.length > 0) {
        const recentHeader = {
          value: "__recent_header__",
          title: "Recent",
          original: { _isHeader: true, field: { title: "Recent" } },
          disabled: true,
        };
        const separator = {
          value: "__recent_separator__",
          title: "",
          original: { _isSeparator: true, field: { title: "" } },
          disabled: true,
        };
        const allFieldsHeader = {
          value: "__all_fields_header__",
          title: "All fields",
          original: { _isHeader: true, field: { title: "All fields" } },
          disabled: true,
        };
        return [recentHeader, ...recentOptions, separator, allFieldsHeader, ...groupValues];
      }
    }

    return groupValues;
  }, [currentView.availableFilters, recentFieldIds]);

  // Copy/paste handlers use allFiltersSnapshot (includes empty filters)
  // so the user can transfer filter configs between projects or to the SDK.
  const handleCopyFilters = React.useCallback(async () => {
    try {
      const snapshot = currentView.allFiltersSnapshot;
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    } catch (e) {
      console.warn("Failed to copy filters:", e);
    }
  }, [currentView]);

  const showToast = React.useCallback(
    (message, type = "error") => {
      store?.SDK?.invoke?.("toast", { message, type });
    },
    [store],
  );

  const handlePasteFilters = React.useCallback(async () => {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      showToast("Cannot read clipboard. Please allow clipboard access and try again.");
      return;
    }

    let snapshot;
    try {
      snapshot = JSON.parse(text);
    } catch {
      showToast("Clipboard does not contain valid JSON.");
      return;
    }

    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.items)) {
      showToast('Invalid filter format. Expected { "conjunction": "and"|"or", "items": [...] }');
      return;
    }

    const result = currentView.importFilters(snapshot);
    if (result === false) {
      showToast("No matching filter columns found in this project. Filters may be from a different project.");
      return;
    }

    setPasteFeedback(true);
    setTimeout(() => setPasteFeedback(false), 1500);
  }, [currentView, showToast]);

  return (
    <div className={cn("filters").mod({ sidebar: sidebarEnabled }).toClassName()}>
      <div className={cn("filters").elem("list").mod({ withFilters: !!filters.length }).toClassName()}>
        {filters.length ? (
          filters.map((filter, i) => (
            <FilterLine
              index={i}
              filter={filter}
              view={currentView}
              sidebar={sidebarEnabled}
              value={filter.currentValue}
              key={`${filter.filter.id}-${i}`}
              availableFilters={fields}
              dropdownClassName={cn("filters").elem("selector").toClassName()}
              onFieldSelect={handleFieldSelect}
              onFieldUpdate={handleFieldUpdate}
            />
          ))
        ) : (
          <div className={cn("filters").elem("empty").toClassName()}>No filters applied</div>
        )}
      </div>
      <div className={cn("filters").elem("actions").toClassName()}>
        <Button
          size="small"
          look="string"
          onClick={() => currentView.createFilter()}
          leading={<IconPlus className="!h-3 !w-3" />}
        >
          Add {filters.length ? "Another Filter" : "Filter"}
        </Button>

        <div className={cn("filters").elem("actions-right").toClassName()}>
          {filters.length > 0 && (
            <Button
              size="small"
              look="string"
              tooltip={copyFeedback ? "Copied!" : "Copy filters to clipboard; Tip: Use it in Label Studio SDK"}
              onClick={handleCopyFilters}
              aria-label="Copy filters"
            >
              <IconCopyOutline className="!w-4 !h-4" />
            </Button>
          )}

          <Button
            size="small"
            look="string"
            tooltip={pasteFeedback ? "Pasted!" : "Paste filters from clipboard"}
            onClick={handlePasteFilters}
            aria-label="Paste filters"
          >
            <IconClipboardCheck className="!w-4 !h-4" />
          </Button>

          {!sidebarEnabled ? (
            <Button
              look="string"
              type="link"
              size="small"
              tooltip="Pin to sidebar"
              onClick={() => views.expandFilters()}
              aria-label="Pin filters to sidebar"
            >
              <IconChevronRight className="!w-4 !h-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
