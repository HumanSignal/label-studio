import { type FC, useCallback, useMemo, useState } from "react";
import { Button, Tooltip } from "@humansignal/ui";
import { IconCopyOutline } from "@humansignal/icons";
import styles from "./CodeView.module.scss";

interface CodeViewProps {
  /** JSON data to display */
  data: any;
}

/**
 * CodeView - Simple code view for JSON data
 *
 * Displays JSON as formatted code with copy functionality.
 * Used as the fallback when the interactive JSON viewer feature flag is disabled.
 */
export const CodeView: FC<CodeViewProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  // Format JSON for display
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // Copy to clipboard functionality
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [jsonString]);

  return (
    <div className={styles.codeView}>
      <div className={styles.codeViewContent}>
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
        <pre className={styles.codeBlock}>{jsonString}</pre>
      </div>
    </div>
  );
};
