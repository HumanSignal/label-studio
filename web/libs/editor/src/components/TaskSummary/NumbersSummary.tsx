import { Skeleton, Tooltip } from "@humansignal/ui";
import { IconInfoOutline, IconWarning } from "@humansignal/icons";

type CardProps = {
  title: string;
  value: number | string;
  info: string;
  /** When true, show a skeleton for the headline value (e.g. task agreement query in flight). */
  loading?: boolean;
  /** Shown after the headline value (e.g. async agreement caveat). */
  valueWarningTooltip?: string;
};

const Card = ({ title, value, info, loading, valueWarningTooltip }: CardProps) => {
  return (
    <div className="flex-1 border border-neutral-border rounded-small p-base bg-neutral-surface">
      <div className="flex flex-row gap-tighter items-center text-xs font-semibold text-neutral-content-subtle uppercase tracking-wide mb-2">
        {title}
        {info && (
          <Tooltip title={info}>
            <IconInfoOutline size={12} style={{ width: 16, height: 16 }} className="text-neutral-content-subtler" />
          </Tooltip>
        )}
      </div>
      <div className="text-headline-large font-bold text-neutral-content min-h-[2.5rem] flex items-center gap-tight">
        {loading ? <Skeleton className="h-8 w-24 max-w-full rounded-small" /> : value}
        {!loading && valueWarningTooltip ? (
          <Tooltip title={valueWarningTooltip}>
            <span
              role="img"
              aria-label="Agreement value mismatch"
              data-testid="agreement-value-mismatch"
              className="inline-flex shrink-0 cursor-help text-warning-content"
            >
              <IconWarning size={20} className="shrink-0" />
            </span>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
};

type Props = {
  values: CardProps[];
};

export const NumbersSummary = ({ values }: Props) => {
  return (
    <div className="flex flex-row gap-base">
      {values.map((value) => (
        <Card key={value.title} {...value} />
      ))}
    </div>
  );
};
