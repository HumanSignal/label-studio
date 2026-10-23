import { Badge } from "../badge/badge";
import { Typography } from "../typography/typography";
import type { TaxonomySelectionItem, TaxonomySelectionListProps } from "./types";

interface TaxonomySelectionBadgeProps extends Pick<TaxonomySelectionListProps, "onRemove"> {
  item: TaxonomySelectionItem;
}

export function TaxonomySelectionBadge({ item, onRemove }: TaxonomySelectionBadgeProps) {
  return (
    <Badge
      variant="grape"
      look="filled"
      size="small"
      shape="squared"
      className="htx-taxonomy-selection-item max-w-full min-w-0 shrink"
      maxWidth={220}
      closeLabel={`Remove ${item.label}`}
      onClose={onRemove ? () => onRemove(item.value) : undefined}
    >
      <Typography
        as="span"
        variant="label"
        size="smaller"
        fontStyle={item.isUserAdded ? "italic" : "normal"}
        className="htx-taxonomy-selection-item-label"
      >
        {item.label}
      </Typography>
    </Badge>
  );
}
