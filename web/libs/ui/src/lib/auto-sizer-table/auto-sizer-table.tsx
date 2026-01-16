import { type FC, forwardRef, type ForwardedRef } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import InfiniteLoader from "react-window-infinite-loader";
import { VariableSizeList } from "react-window";
import clsx from "clsx";

export interface AutoSizerTableProps {
  totalCount: number;
  loadMore: (startIndex: number, stopIndex: number) => Promise<void>;
  isItemLoaded: (index: number) => boolean;
  itemData: any;
  itemSize: (index: number) => number;
  initialScrollOffset?: (height: number) => number;
  className?: string;
  children: FC<any>;
  heightAdjustment?: number;
  isLoading?: boolean;
}

export const AutoSizerTable = forwardRef<VariableSizeList, AutoSizerTableProps>(
  (
    {
      totalCount,
      loadMore,
      isItemLoaded,
      itemData,
      itemSize,
      initialScrollOffset,
      className,
      children: ItemWrapper,
      heightAdjustment = 0,
      isLoading = false,
      ...rest
    },
    ref: ForwardedRef<VariableSizeList>,
  ) => {
    // Enhance itemData with isLoading state
    const enhancedItemData = { ...itemData, isLoading };
    return (
      <AutoSizer className={clsx(className)}>
        {({ width, height }) => {
          const adjustedHeight = Math.max(0, height - heightAdjustment);

          return (
            <InfiniteLoader
              itemCount={totalCount}
              loadMoreItems={loadMore}
              isItemLoaded={isItemLoaded}
              threshold={5}
              minimumBatchSize={30}
              ref={ref}
            >
              {({
                onItemsRendered,
                ref: infiniteLoaderRef,
              }: { onItemsRendered: (params: { startIndex: number; stopIndex: number }) => void; ref: any }) => {
                return (
                  <VariableSizeList
                    ref={infiniteLoaderRef}
                    width={width}
                    height={adjustedHeight}
                    itemCount={totalCount}
                    itemData={enhancedItemData}
                    itemSize={itemSize}
                    onItemsRendered={onItemsRendered}
                    initialScrollOffset={initialScrollOffset?.(adjustedHeight) ?? 0}
                    {...rest}
                  >
                    {ItemWrapper}
                  </VariableSizeList>
                );
              }}
            </InfiniteLoader>
          );
        }}
      </AutoSizer>
    );
  },
);

AutoSizerTable.displayName = "AutoSizerTable";

export default AutoSizerTable;
