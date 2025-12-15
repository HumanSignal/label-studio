import { type FC, useCallback, useContext, useMemo } from "react";
import {
  IconCursor,
  IconClockTimeFourOutline,
  IconList,
  IconOutlinerEyeClosed,
  IconOutlinerEyeOpened,
  IconSortDown,
  IconSortUp,
  IconBoundingBox,
  IconPredictions,
} from "@humansignal/icons";
import { Button } from "../../../common/Button/Button";
import { Dropdown } from "../../../common/Dropdown/Dropdown";
// eslint-disable-next-line
// @ts-ignore
import { Menu } from "../../../common/Menu/Menu";
import { BemWithSpecifiContext } from "../../../utils/bem";
import { SidePanelsContext } from "../SidePanelsContext";
import "./ViewControls.scss";
import { FF_DEV_3873, isFF } from "../../../utils/feature-flags";
import { observer } from "mobx-react";

const { Block, Elem } = BemWithSpecifiContext();

export type GroupingOptions = "manual" | "label" | "type";

export type OrderingOptions = "score" | "date" | "intensity_r" | "intensity_g" | "intensity_b";

export type OrderingDirection = "asc" | "desc";

interface ViewControlsProps {
  ordering: OrderingOptions;
  orderingDirection?: OrderingDirection;
  regions: any;
  onOrderingChange: (ordering: OrderingOptions) => void;
  onOrderingDirectionToggle: () => void;
  onGroupingChange: (grouping: GroupingOptions) => void;
  onFilterChange: (filter: any) => void;
}

export const ViewControls: FC<ViewControlsProps> = observer(
  ({ ordering, regions, orderingDirection, onOrderingChange, onOrderingDirectionToggle, onGroupingChange, onFilterChange }) => {
    const grouping = regions.group;
    const context = useContext(SidePanelsContext);
    const getGroupingLabels = useCallback((value: GroupingOptions): LabelInfo => {
      switch (value) {
        case "manual":
          return {
            label: (
              <>
                <IconList /> Group Manually
              </>
            ),
            selectedLabel: isFF(FF_DEV_3873) ? "Manual" : "Manual Grouping",
            icon: <IconList width={16} height={16} />,
            tooltip: "Manually Grouped",
          };
        case "label":
          return {
            label: (
              <>
                <IconBoundingBox /> Group by Label
              </>
            ),
            selectedLabel: isFF(FF_DEV_3873) ? "By Label" : "Grouped by Label",
            icon: <IconBoundingBox width={16} height={16} />,
            tooltip: "Grouped by Label",
          };
        case "type":
          return {
            label: (
              <>
                <IconCursor /> Group by Tool
              </>
            ),
            selectedLabel: isFF(FF_DEV_3873) ? "By Tool" : "Grouped by Tool",
            icon: <IconCursor width={16} height={16} />,
            tooltip: "Grouped by Tool",
          };
      }
    }, []);

    const getOrderingLabels = useCallback((value: OrderingOptions): LabelInfo => {
      switch (value) {
        case "date":
          return {
            label: (
              <>
                <IconClockTimeFourOutline /> Order by Time
              </>
            ),
            selectedLabel: "By Time",
            icon: <IconClockTimeFourOutline width={16} height={16} />,
          };
        case "score":
          return {
            label: (
              <>
                <IconPredictions /> Order by Score
              </>
            ),
            selectedLabel: "By Score",
            icon: <IconPredictions width={16} height={16} />,
          };
        case "intensity_r":
          return {
            label: (
              <>
                <IconPredictions /> Order by Mean Red
              </>
            ),
            selectedLabel: "By Mean Red",
            icon: <IconPredictions width={16} height={16} />,
          };
        case "intensity_g":
          return {
            label: (
              <>
                <IconPredictions /> Order by Mean Green
              </>
            ),
            selectedLabel: "By Mean Green",
            icon: <IconPredictions width={16} height={16} />,
          };
        case "intensity_b":
          return {
            label: (
              <>
                <IconPredictions /> Order by Mean Blue
              </>
            ),
            selectedLabel: "By Mean Blue",
            icon: <IconPredictions width={16} height={16} />,
          };
      }
    }, []);

    const renderOrderingDirectionIcon = orderingDirection === "asc" ? <IconSortUp /> : <IconSortDown />;

    return (
      <Block name="view-controls" mod={{ collapsed: context.locked }}>
        <Grouping
          value={grouping}
          options={["manual", "type", "label"]}
          onChange={(value) => onGroupingChange(value)}
          readableValueForKey={getGroupingLabels}
        />
        {grouping === "manual" && (
          <Elem name="sort">
            <Grouping
              value={ordering}
              direction={orderingDirection}
              options={["score", "date", "intensity_r", "intensity_g", "intensity_b"]}
              onChange={(value) => onOrderingChange(value)}
              readableValueForKey={getOrderingLabels}
              allowClickSelected={false}
            />
            <Elem
              tag={Button}
              type="text"
              onClick={onOrderingDirectionToggle}
              aria-label={orderingDirection === "asc" ? "Sort descending" : "Sort ascending"}
              tooltip={orderingDirection === "asc" ? "High to low" : "Low to high"}
              tooltipTheme="dark"
            >
              {renderOrderingDirectionIcon}
            </Elem>
          </Elem>
        )}
        <ToggleRegionsVisibilityButton regions={regions} />
      </Block>
    );
  },
);

interface LabelInfo {
  label: string | React.ReactNode | JSX.Element;
  selectedLabel: string;
  icon: JSX.Element;
  tooltip?: string;
}

interface GroupingProps<T extends string> {
  value: T;
  options: T[];
  direction?: OrderingDirection;
  allowClickSelected?: boolean;
  onChange: (value: T) => void;
  readableValueForKey: (value: T) => LabelInfo;
  extraIcon?: JSX.Element;
}

const Grouping = <T extends string>({
  value,
  options,
  direction,
  allowClickSelected,
  onChange,
  readableValueForKey,
  extraIcon,
}: GroupingProps<T>) => {
  const readableValue = useMemo(() => {
    return readableValueForKey(value);
  }, [value]);

  const optionsList: [T, LabelInfo][] = useMemo(() => {
    return options.map((key) => [key, readableValueForKey(key)]);
  }, []);

  const dropdownContent = useMemo(() => {
    return (
      <Menu
        size="medium"
        style={{
          width: 200,
          minWidth: 200,
          borderRadius: isFF(FF_DEV_3873) && 4,
        }}
        selectedKeys={[value]}
        allowClickSelected={allowClickSelected}
      >
        {optionsList.map(([key, label]) => (
          <GroupingMenuItem
            key={key}
            name={key}
            value={value}
            direction={direction}
            label={label}
            onChange={(value) => onChange(value)}
          />
        ))}
      </Menu>
    );
  }, [value, optionsList, readableValue, direction, onChange]);

  // mods are already set in the button from type, so use it only in new UI
  const extraStyles = isFF(FF_DEV_3873) ? { mod: { newUI: true } } : undefined;
  const style = isFF(FF_DEV_3873) ? { padding: "0 12px 0 2px" } : {};

  return (
    <Dropdown.Trigger content={dropdownContent} style={{ width: 200 }}>
      <Button
        type="text"
        data-testid={`grouping-${value}`}
        {...extraStyles}
        icon={readableValue.icon}
        style={style}
        extra={
          isFF(FF_DEV_3873) ? (
            extraIcon
          ) : (
            <DirectionIndicator direction={direction} name={value} value={value} wrap={false} />
          )
        }
        tooltip={readableValue.tooltip || undefined}
        tooltipTheme="dark"
      >
        {readableValue.selectedLabel}
      </Button>
    </Dropdown.Trigger>
  );
};

interface GroupingMenuItemProps<T extends string> {
  name: T;
  label: LabelInfo;
  value: T;
  direction?: OrderingDirection;
  onChange: (key: T) => void;
}

const GroupingMenuItem = <T extends string>({ value, name, label, direction, onChange }: GroupingMenuItemProps<T>) => {
  return (
    <Menu.Item name={name} onClick={() => onChange(name)}>
      <Elem name="label">
        {label.label}
        <DirectionIndicator direction={direction} name={name} value={value} />
      </Elem>
    </Menu.Item>
  );
};

interface DirectionIndicator {
  direction?: OrderingDirection;
  value: string;
  name: string;
  wrap?: boolean;
}

const DirectionIndicator: FC<DirectionIndicator> = ({ direction, value, name, wrap = true }) => {
  const content = direction === "asc" ? <IconSortUp /> : <IconSortDown />;

  if (!direction || value !== name || isFF(FF_DEV_3873)) return null;
  if (!wrap) return content;

  return <span>{content}</span>;
};

interface ToggleRegionsVisibilityButton {
  regions: any;
}

const ToggleRegionsVisibilityButton = observer<FC<ToggleRegionsVisibilityButton>>(({ regions }) => {
  const toggleRegionsVisibility = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      regions.toggleVisibility();
    },
    [regions],
  );

  const isDisabled = !regions?.regions?.length;
  const isAllHidden = !isDisabled && regions.isAllHidden;

  return (
    <Elem
      tag={Button}
      type="text"
      disabled={isDisabled}
      onClick={toggleRegionsVisibility}
      mod={{ hidden: isAllHidden }}
      aria-label={isAllHidden ? "Show all regions" : "Hide all regions"}
      icon={
        isAllHidden ? (
          <IconOutlinerEyeClosed width={16} height={16} />
        ) : (
          <IconOutlinerEyeOpened width={16} height={16} />
        )
      }
      tooltip={isAllHidden ? "Show all regions" : "Hide all regions"}
      tooltipTheme="dark"
    />
  );
});
