import { type ChangeEvent, type FC, useCallback, useContext, useMemo, useState } from "react";
import {
  IconCursor,
  IconClockTimeFourOutline,
  IconList,
  IconOutlinerEyeClosed,
  IconOutlinerEyeOpened,
  IconSortDown,
  IconSortUp,
  IconBoundingBox,
  IconFilter,
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

export type OrderingOptions = "score" | "date" | "intensity_r" | "intensity_g" | "intensity_b" | "area" | "bbox_width" | "bbox_height";

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
        case "area":
          return {
            label: (
              <>
                <IconBoundingBox /> Order by Area
              </>
            ),
            selectedLabel: "By Area",
            icon: <IconBoundingBox width={16} height={16} />,
          };
        case "bbox_width":
          return {
            label: (
              <>
                <IconBoundingBox /> Order by Width
              </>
            ),
            selectedLabel: "By Width",
            icon: <IconBoundingBox width={16} height={16} />,
          };
        case "bbox_height":
          return {
            label: (
              <>
                <IconBoundingBox /> Order by Height
              </>
            ),
            selectedLabel: "By Height",
            icon: <IconBoundingBox width={16} height={16} />,
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
              options={["score", "date", "area", "bbox_width", "bbox_height", "intensity_r", "intensity_g", "intensity_b"]}
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
            <RegionMetricsFilter regions={regions} />
            <BulkGroupAssignment regions={regions} />
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

interface RegionMetricsFilterProps {
  regions: any;
}

type Range = {
  min?: number;
  max?: number;
};

type MetricsCriteria = {
  width?: Range;
  height?: Range;
  area?: Range;
  meanR?: Range;
  meanG?: Range;
  meanB?: Range;
};

type MetricsState = {
  minWidth: string;
  maxWidth: string;
  minHeight: string;
  maxHeight: string;
  minArea: string;
  maxArea: string;
  minR: string;
  maxR: string;
  minG: string;
  maxG: string;
  minB: string;
  maxB: string;
};

const initialMetricsState: MetricsState = {
  minWidth: "",
  maxWidth: "",
  minHeight: "",
  maxHeight: "",
  minArea: "",
  maxArea: "",
  minR: "",
  maxR: "",
  minG: "",
  maxG: "",
  minB: "",
  maxB: "",
};

const RegionMetricsFilter: FC<RegionMetricsFilterProps> = ({ regions }) => {
  const [state, setState] = useState<MetricsState>(initialMetricsState);

  const onChangeField = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const parseRange = (min: string, max: string): Range | undefined => {
    const parsedMin = min !== "" ? Number(min) : undefined;
    const parsedMax = max !== "" ? Number(max) : undefined;

    if (!Number.isFinite(parsedMin as number) && !Number.isFinite(parsedMax as number)) {
      return undefined;
    }

    const range: Range = {};

    if (Number.isFinite(parsedMin as number)) range.min = parsedMin as number;
    if (Number.isFinite(parsedMax as number)) range.max = parsedMax as number;

    return Object.keys(range).length ? range : undefined;
  };

  const applyFilter = useCallback(() => {
    const criteria: MetricsCriteria = {};

    const width = parseRange(state.minWidth, state.maxWidth);
    const height = parseRange(state.minHeight, state.maxHeight);
    const area = parseRange(state.minArea, state.maxArea);
    const meanR = parseRange(state.minR, state.maxR);
    const meanG = parseRange(state.minG, state.maxG);
    const meanB = parseRange(state.minB, state.maxB);

    if (width) criteria.width = width;
    if (height) criteria.height = height;
    if (area) criteria.area = area;
    if (meanR) criteria.meanR = meanR;
    if (meanG) criteria.meanG = meanG;
    if (meanB) criteria.meanB = meanB;

    if (regions?.filterByMetrics) {
      regions.filterByMetrics(criteria);
    } else if (regions && typeof regions.setFilteredRegions === "function") {
      // Fallback to legacy API if metrics filtering is not available
      regions.setFilteredRegions(regions.regions);
    }
  }, [state, regions]);

  const clearFilter = useCallback(() => {
    setState(initialMetricsState);

    if (regions?.filterByMetrics) {
      regions.filterByMetrics({});
    } else if (regions && typeof regions.setFilteredRegions === "function") {
      regions.setFilteredRegions(regions.regions);
    }
  }, [regions]);

  const content = useMemo(
    () => (
      <div className="view-controls__metrics-filter">
        <div className="view-controls__metrics-filter-row">
          <span>W (px)</span>
          <input
            type="number"
            name="minWidth"
            value={state.minWidth}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxWidth"
            value={state.maxWidth}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-row">
          <span>H (px)</span>
          <input
            type="number"
            name="minHeight"
            value={state.minHeight}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxHeight"
            value={state.maxHeight}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-row">
          <span>A (px²)</span>
          <input
            type="number"
            name="minArea"
            value={state.minArea}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxArea"
            value={state.maxArea}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-row">
          <span>R</span>
          <input
            type="number"
            name="minR"
            value={state.minR}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxR"
            value={state.maxR}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-row">
          <span>G</span>
          <input
            type="number"
            name="minG"
            value={state.minG}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxG"
            value={state.maxG}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-row">
          <span>B</span>
          <input
            type="number"
            name="minB"
            value={state.minB}
            onChange={onChangeField}
            placeholder="min"
          />
          <input
            type="number"
            name="maxB"
            value={state.maxB}
            onChange={onChangeField}
            placeholder="max"
          />
        </div>
        <div className="view-controls__metrics-filter-actions">
          <Button type="text" onClick={clearFilter}>
            Clear
          </Button>
          <Button type="primary" onClick={applyFilter}>
            Apply
          </Button>
        </div>
      </div>
    ),
    [state, onChangeField, applyFilter, clearFilter],
  );

  return (
    <Dropdown.Trigger content={content}>
      <Button
        type="text"
        icon={<IconFilter width={16} height={16} />}
        aria-label="Filter regions by width/height/area/R/G/B"
        tooltip="Filter regions by width/height/area/R/G/B"
        tooltipTheme="dark"
      />
    </Dropdown.Trigger>
  );
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

interface BulkGroupAssignmentProps {
  regions: any;
}

const BulkGroupAssignment: FC<BulkGroupAssignmentProps> = observer(({ regions }) => {
  const [value, setValue] = useState("");

  const hasSelection = regions?.hasSelection;

  const applyGroup = useCallback(() => {
    if (!regions?.selection?.list || !value) return;

    regions.selection.list.forEach((region: any) => {
      if (typeof region.setMetaGroup === "function") {
        region.setMetaGroup(value);
      }
    });
  }, [regions, value]);

  if (!hasSelection) return null;

  return (
    <Dropdown.Trigger
      content={
        <div className="view-controls__metrics-filter">
          <div className="view-controls__metrics-filter-row">
            <span>Group</span>
            <input
              type="text"
              name="group"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Group name"
            />
          </div>
          <div className="view-controls__metrics-filter-actions">
            <Button type="primary" onClick={applyGroup}>
              Apply
            </Button>
          </div>
        </div>
      }
    >
      <Button
        type="text"
        aria-label="Assign group to selected regions"
        tooltip="Assign group to selected regions"
        tooltipTheme="dark"
      >
        Group
      </Button>
    </Dropdown.Trigger>
  );
});
