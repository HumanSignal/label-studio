import { observer } from "mobx-react";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "@humansignal/core/lib/utils/debounce";
import { useDataManagerUsers } from "../../hooks/useUsers";
import { Select, Tooltip, Userpic } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { SelectSize } from "@humansignal/ui/lib/select/types";
import { userDisplayName } from "@humansignal/core/lib/utils/helpers";

const DEBOUNCE_DELAY = 300;

export const UserSelect = observer(({ filter, onChange, multiple, value, placeholder, disabled }) => {
  const [search, setSearch] = useState(null);
  const [selectedValue, setSelectedValue] = useState(value);

  // Get project ID from the filter context or use a default
  const projectId = filter?.view?.project?.id || 1;
  const optionsPerRequest = 10;

  const debouncedSearch = useCallback(
    debounce((val) => setSearch(val), DEBOUNCE_DELAY),
    [],
  );

  const { users, hasMore, total, loadMore } = useDataManagerUsers(
    projectId,
    optionsPerRequest,
    false,
    null,
    search,
    selectedValue,
  );
  const options = useMemo(() => {
    return users.map((user) => {
      const displayName = userDisplayName(user);
      user.displayName = displayName;
      return {
        value: user.id,
        raw: { id: user.id, email: user.email, displayName, username: user.username },
        label: (
          <Tooltip title={user.displayName} alignment="top-left">
            <div className="flex gap-2 w-full items-center">
              <Userpic user={user} size={16} key={`user-${user.id}`} showName={true} />
              <span className="text-ellipsis text-nowrap overflow-hidden w-full">{user.displayName}</span>
            </div>
          </Tooltip>
        ),
      };
    });
  }, [users, hasMore, loadMore]);

  const _onChange = useCallback(
    (val) => {
      setSelectedValue(val);
      onChange?.(val);
      setSearch(null);
    },
    [onChange],
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

  // Convert users data to options format for Select component
  return (
    <Select
      options={options}
      value={selectedValue}
      onChange={_onChange}
      triggerClassName={`${cn("form-select").elem("list").toString()} w-[200px]`}
      loadMore={loadMore}
      size={SelectSize.SMALL}
      placeholder={placeholder}
      disabled={disabled}
      multiple={multiple}
      isVirtualList={true}
      searchable={true}
      onSearch={debouncedSearch}
      searchFilter={searchFilter}
      itemCount={total}
    />
  );
});
