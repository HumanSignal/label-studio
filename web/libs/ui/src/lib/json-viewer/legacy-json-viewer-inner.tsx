import { useMemo } from "react";
import { JsonEditor, defaultTheme } from "json-edit-react";
import { IconCopyOutline } from "@humansignal/icons";
import { ReaderViewButton } from "./reader-view-button";

// Custom Label Studio theme for json-edit-react
// Note: Colors are applied via SCSS using :global selectors because
// json-edit-react doesn't support CSS variables in theme configuration
const labelStudioTheme = {
  ...defaultTheme,
  displayName: "Label Studio",
  styles: {
    ...defaultTheme.styles,
    container: {
      backgroundColor: "var(--json-viewer-background)",
      color: "var(--color-neutral-content)",
    },
    collection: {
      ...((defaultTheme.styles as any).collection || {}),
      backgroundColor: "var(--json-viewer-collection-background)",
    },
  },
};

export type LegacyJsonViewerInnerProps = {
  data: unknown;
  viewOnly: boolean;
  searchText: string;
  searchFilter: "all" | ((nodeData: any, searchTerm: string) => boolean);
  collapseDepth: number | boolean;
  resetKey: number;
  fontSize: string | number;
  stringTruncate?: number;
  readerViewThreshold: number;
};

export const LegacyJsonViewerInner = ({
  data,
  viewOnly,
  searchText,
  searchFilter,
  collapseDepth,
  resetKey,
  fontSize,
  stringTruncate,
  readerViewThreshold,
}: LegacyJsonViewerInnerProps) => {
  const customButtons = useMemo(() => {
    if (!readerViewThreshold || readerViewThreshold <= 0) {
      return undefined;
    }

    return [
      {
        Element: (props: any) => <ReaderViewButton {...props} threshold={readerViewThreshold} />,
      },
    ] as any;
  }, [readerViewThreshold]);

  const customIcons = useMemo(
    () => ({
      copy: <IconCopyOutline width={20} height={20} />,
    }),
    [],
  );

  return (
    <JsonEditor
      key={resetKey}
      data={data}
      restrictEdit={viewOnly}
      restrictDelete={viewOnly}
      restrictAdd={viewOnly}
      searchText={searchText}
      searchFilter={searchFilter}
      theme={labelStudioTheme}
      collapse={collapseDepth}
      showCollectionCount={true}
      minWidth="100%"
      maxWidth="100%"
      rootFontSize={fontSize}
      stringTruncate={stringTruncate}
      enableClipboard={true}
      icons={customIcons}
      customButtons={customButtons}
    />
  );
};
