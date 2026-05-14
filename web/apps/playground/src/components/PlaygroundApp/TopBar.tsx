import { memo, useCallback } from "react";
import { ThemeToggle, Tooltip } from "@humansignal/ui";
import { IconCopyOutline, IconLink } from "@humansignal/icons";
import { useAtomValue } from "jotai";
import { configAtom } from "../../atoms/configAtoms";
import { getParentUrl } from "../../utils/url";
import { useCopyText } from "../../hooks/useCopyText";

const ShareUrlButton = () => {
  const config = useAtomValue(configAtom);
  const copyText = useCopyText({
    successMessage: "URL copied to clipboard",
    errorMessage: "Failed to copy URL to clipboard",
  });

  const handleCopy = useCallback(() => {
    const url = getParentUrl();
    url.searchParams.set("config", encodeURIComponent(config.replace(/\n/g, "<br>")));
    copyText(url.toString());
  }, [config, copyText]);

  return (
    <Tooltip title="Share labeling config URL">
      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 gap-2 border border-neutral-border rounded-md"
        aria-label="Share labeling config URL"
        onClick={handleCopy}
      >
        <IconLink width={22} height={22} className="flex-shrink-0" />
      </button>
    </Tooltip>
  );
};

const CopyButton = () => {
  const config = useAtomValue(configAtom);
  const copyText = useCopyText({
    successMessage: "Config copied to clipboard",
    errorMessage: "Failed to copy config to clipboard",
  });

  const handleCopy = useCallback(() => {
    copyText(config);
  }, [config, copyText]);

  return (
    <Tooltip title="Copy labeling config">
      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 gap-2 border border-neutral-border rounded-md"
        aria-label="Copy labeling config"
        onClick={handleCopy}
      >
        <IconCopyOutline width={18} height={18} className="flex-shrink-0" />
      </button>
    </Tooltip>
  );
};

const ShareButtons = () => {
  return (
    <div className="flex items-center gap-2">
      <CopyButton />
      <ShareUrlButton />
    </div>
  );
};

export const TopBar = memo(
  () => {
    return (
      <div className="flex items-center h-10 px-tight text-heading-medium justify-between select-none border-b border-neutral-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-body-medium">
            Label Studio <span className="text-accent-persimmon-base">Playground</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ShareButtons />
          <ThemeToggle />
        </div>
      </div>
    );
  },
  () => true,
);
