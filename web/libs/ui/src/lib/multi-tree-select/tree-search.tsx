import { MagnifyingGlassIcon } from "@humansignal/icons";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo, useEffect, useRef, useState } from "react";
import { useTreeContext } from "./tree-context";

export const TreeSearch = memo(({ placeholder = "Search..." }: { placeholder?: string }) => {
  const { search, searchQuery } = useTreeContext();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => searchQuery.current);

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
    search(e.currentTarget.value);
  };

  return (
    <div className={cn("multi-tree-select__content").elem("search__container").toClassName()}>
      <MagnifyingGlassIcon size={20} aria-hidden="true" />
      <input
        ref={searchInputRef}
        className={cn("multi-tree-select__content").elem("search").toClassName()}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
});
