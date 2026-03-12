import { Button, cnm, IconCheck, IconCopy } from "@humansignal/ui";
import styles from "./code-block.module.css";
import { useCopyText } from "@humansignal/core/lib/hooks/useCopyText";

export function CodeBlock({
  code,
  className,
  variant = "default",
  allowCopy,
}: {
  title?: string;
  description?: string;
  code: string;
  className?: string;
  variant?: "default" | "warning" | "negative";
  allowCopy?: boolean;
}) {
  const variantStyles = {
    default: "bg-neutral-surface border-neutral-border",
    warning: "bg-warning-background border-warning-border-subtle",
    negative: "bg-negative-background border-negative-border-subtle",
  };

  const [copyCode, isCopied] = useCopyText();

  return (
    <div
      className={cnm(
        "relative p-3 rounded-small border border-neutral-border text-14 text-neutral-content overflow-y-auto",
        "scrollbar-thin scrollbar-thumb-neutral-border-bold scrollbar-track-transparent",
        variantStyles[variant],
        styles["code-block-shadow"],
        className,
      )}
    >
      <pre className="whitespace-pre-wrap">{code.trim()}</pre>
      {allowCopy && (
        <Button size="small" look="string" className="absolute top-1 right-2" onClick={() => copyCode(code)}>
          {isCopied ? <IconCheck /> : <IconCopy />}
        </Button>
      )}
    </div>
  );
}
