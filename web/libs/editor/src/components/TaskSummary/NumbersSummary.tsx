import { Tooltip } from "@humansignal/ui";
import { IconInfoOutline } from "@humansignal/icons";

type CardProps = {
  title: string;
  value: number | string;
  info: string;
};

const Card = ({ title, value, info }: CardProps) => {
  return (
    <div className="flex-1 border border-neutral-border rounded-small p-base bg-neutral-surface-subtle">
      <div className="flex flex-row gap-tighter items-center text-xs font-semibold text-neutral-content-subtle uppercase tracking-wide mb-2">
        {title}
        {info && (
          <Tooltip title={info}>
            <IconInfoOutline size={12} style={{ width: 16, height: 16 }} className="text-neutral-content-subtler" />
          </Tooltip>
        )}
      </div>
      <div className="text-headline-large font-bold text-neutral-content">{value}</div>
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
