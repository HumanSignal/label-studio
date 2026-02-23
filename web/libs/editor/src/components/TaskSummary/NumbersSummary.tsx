import { Tooltip } from "@humansignal/ui";
import { IconQuestionOutline } from "@humansignal/icons";

type CardProps = {
  title: string;
  value: number | string;
  info: string;
};

const Card = ({ title, value, info }: CardProps) => {
  return (
    <div className="flex-1 flex flex-col justify-between border border-neutral-border rounded-small px-base py-tight bg-neutral-background min-h-[104px] hover:bg-primary-emphasis-subtle hover:border-primary-border-subtlest transition-colors">
      <div className="flex flex-row gap-tight items-center text-body-small font-medium text-neutral-content-subtler">
        {title}
        {info && (
          <Tooltip title={info} style={{ width: "300px", maxWidth: "none" }} interactive>
            <IconQuestionOutline style={{ opacity: 0.5 }} width={14} height={14} />
          </Tooltip>
        )}
      </div>
      <div className="text-headline-large font-semibold text-neutral-content">{value}</div>
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
