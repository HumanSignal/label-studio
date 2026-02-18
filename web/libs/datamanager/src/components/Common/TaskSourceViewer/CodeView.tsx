import { type FC, useCallback, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { Button, Tooltip } from "@humansignal/ui";
import { IconCopyOutline } from "@humansignal/icons";
import styles from "./CodeView.module.scss";

interface CodeViewProps {
  /** JSON data to display */
  data: any;
}

/** Height of each line in pixels (monospace font ~14px + line-height padding) */
const LINE_HEIGHT = 20;

/**
 * CodeView - Virtualized code view for JSON data
 *
 * Splits formatted JSON into lines and uses react-window to render only
 * the visible lines. This prevents the browser from freezing when displaying
 * tasks with thousands of annotations.
 */
export const CodeView: FC<CodeViewProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const listRef = useRef<List>(null);

  // Format JSON and split into lines for virtualization
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const lines = useMemo(() => jsonString.split("\n"), [jsonString]);

  // Copy to clipboard functionality
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [jsonString]);

  // Render a single line
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style} className={styles.line}>
        {lines[index]}
      </div>
    ),
    [lines],
  );

  return (
    <div className={styles.codeView}>
      <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
        <Button
          look="outlined"
          variant="neutral"
          size="small"
          className={styles.copyButton}
          onClick={handleCopy}
          leading={<IconCopyOutline width={20} height={20} />}
        />
      </Tooltip>
      <div className={styles.listContainer}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={lines.length}
              itemSize={LINE_HEIGHT}
              overscanCount={20}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};
