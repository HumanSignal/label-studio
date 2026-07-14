import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo, type ReactNode } from "react";
import { Spinner } from "../spinner/spinner";
import { RootSymbol, useTreeContext } from "./tree-context";
import { TreeNode } from "./tree-node";

interface TreeSelectProps {
  allLabel?: string;
  emptyState?: ReactNode;
}

export const TreeSelect = memo(({ allLabel, emptyState }: TreeSelectProps) => {
  const { data, searchIndexed, disableAllOption, isSearching, searchResultCount } = useTreeContext();

  const hasNoResults = isSearching && searchResultCount === 0;

  return (
    <div className={cn("multi-tree-select__content").elem("select").toClassName()}>
      {allLabel && searchIndexed && !disableAllOption && (
        <TreeNode id={RootSymbol.toString()} label={allLabel} children={[]} searchBy={[]} />
      )}
      {searchIndexed ? (
        hasNoResults && emptyState ? (
          emptyState
        ) : (
          data.current.map((node) => <TreeNode key={node.id} {...node} />)
        )
      ) : (
        <div className="flex items-center justify-center w-full p-wide min-h-[80px]">
          <Spinner size={24} />
        </div>
      )}
    </div>
  );
});
