import { observer } from "mobx-react";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "@humansignal/core/lib/utils/debounce";
import { useDataManagerUsers } from "../../hooks/useUsers";
import { Select, Tooltip, Typography, Avatar } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { SelectSize } from "@humansignal/ui";
import { userDisplayName } from "@humansignal/core/lib/utils/helpers";
import "./UserSelect.prefix.css";

const DEBOUNCE_DELAY = 300;

const normalizeSelectedValue = (value, multiple) => {
  if (!multiple) {
    return Array.isArray(value) ? value[0] : value;
  }
  return Array.isArray(value) ? value : value != null ? [value] : [];
};

export const getUserOptionLabel = (user: { email?: string | null }, displayName: string) =>
  user.email && user.email !== displayName ? `${displayName} (${user.email})` : displayName;

/** Compact closed-trigger summary for multi-select — first user + overflow count (FIT-2394). */
export type UserSelectSelectedOption = {
  raw?: { displayName?: string | null; email?: string | null } | null;
  label?: unknown;
};

export const summarizeSelectedUsers = (
  selectedOptions: UserSelectSelectedOption[] | undefined,
  placeholder?: string,
): { primaryLabel: string; overflowCount: number } => {
  if (!selectedOptions?.length) {
    return { primaryLabel: placeholder ?? "", overflowCount: 0 };
  }
  const first = selectedOptions[0];
  const primaryLabel = first.raw?.displayName?.trim() || first.raw?.email?.trim() || placeholder || "Selected";
  return { primaryLabel, overflowCount: Math.max(0, selectedOptions.length - 1) };
};

const UserLabel = ({ user, title, children }) => (
  <Tooltip title={title} alignment="top-left">
    <div className="flex w-full min-w-0 items-center gap-tight">
      <Avatar user={user} size="smaller" />
      {children}
    </div>
  </Tooltip>
);

export const UserSelect = observer(({ filter, onChange, multiple, value, placeholder, disabled, readOnly }) => {
  const [search, setSearch] = useState(null);
  const selectedValue = useMemo(() => normalizeSelectedValue(value, multiple), [multiple, value]);

  // Get project ID from the filter context or use a default
  const projectId = filter?.view?.project?.id || 1;
  const optionsPerRequest = 10;

  const debouncedSearch = useCallback(
    debounce((val) => setSearch(val), DEBOUNCE_DELAY),
    [],
  );

  const { users, total, loadMore, isLoading } = useDataManagerUsers(
    projectId,
    optionsPerRequest,
    search,
    selectedValue,
    {
      column: filter?.field?.alias,
    },
  );
  const options = useMemo(() => {
    return users.filter(Boolean).map((user) => {
      const displayName = userDisplayName(user);
      const optionLabel = getUserOptionLabel(user, displayName);
      const displayUser = { ...user, displayName };

      return {
        value: user.id,
        raw: { id: user.id, email: user.email, displayName, username: user.username },
        user: displayUser,
        optionLabel,
        label: (
          <UserLabel user={displayUser} title={optionLabel}>
            <Typography as="span" className="min-w-0 truncate">
              {optionLabel}
            </Typography>
          </UserLabel>
        ),
      };
    });
  }, [users]);

  const _onChange = useCallback(
    (val) => {
      if (disabled || readOnly) return;
      const nextValue = multiple ? (val ? [].concat(val) : []) : val;
      onChange?.(nextValue);
      if (!multiple) setSearch(null);
    },
    [multiple, onChange, disabled, readOnly],
  );

  const searchFilter = useCallback((option: any, queryString: string) => {
    const user = option.raw;
    return (
      user.id?.toString().toLowerCase().includes(queryString.toLowerCase()) ||
      user.email?.toLowerCase().includes(queryString.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(queryString.toLowerCase()) ||
      user.username?.toLowerCase().includes(queryString.toLowerCase())
    );
  }, []);

  const renderSelected = useCallback(
    (selectedOptions, selectPlaceholder) => {
      if (!selectedOptions?.length) {
        return <span className="truncate w-full">{selectPlaceholder ?? placeholder}</span>;
      }

      // Single selection keeps the full label; the text takes the trigger's font size.
      if (!multiple || selectedOptions.length === 1) {
        const selected = selectedOptions[0];
        if (selected?.user) {
          return (
            <UserLabel user={selected.user} title={selected.optionLabel}>
              <span className="min-w-0 truncate">{selected.optionLabel}</span>
            </UserLabel>
          );
        }
        return (
          <span className="truncate w-full">
            {summarizeSelectedUsers(selectedOptions, selectPlaceholder).primaryLabel}
          </span>
        );
      }

      const { primaryLabel, overflowCount } = summarizeSelectedUsers(selectedOptions, selectPlaceholder);
      const firstUser = selectedOptions[0]?.user ?? selectedOptions[0]?.raw;

      return (
        <span
          className="flex min-w-0 max-w-full items-center gap-tighter overflow-hidden"
          data-testid="user-select-trigger-summary"
        >
          {firstUser ? <Avatar user={firstUser} size="smaller" /> : null}
          <span className="min-w-0 truncate">{primaryLabel}</span>
          {overflowCount > 0 ? (
            <span className="shrink-0 text-neutral-content-subtler" aria-label={`${overflowCount} more selected`}>
              +{overflowCount}
            </span>
          ) : null}
        </span>
      );
    },
    [multiple, placeholder],
  );

  // Convert users data to options format for Select component
  return (
    <Select
      options={options}
      value={selectedValue}
      onChange={_onChange}
      triggerClassName={`${cn("form-select").elem("list").toString()} w-full max-w-[200px] min-w-0`}
      contentClassName="filter-dropdown-content"
      loadMore={loadMore}
      size={SelectSize.SMALLER}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      multiple={multiple}
      isVirtualList={true}
      withDynamicWidth={true}
      searchable={true}
      isLoading={isLoading}
      onSearch={debouncedSearch}
      searchFilter={searchFilter}
      itemCount={total}
      renderSelected={renderSelected}
    />
  );
});
