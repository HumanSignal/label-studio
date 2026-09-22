import { useEffect, useState } from "react";
import { Button } from "../button/button";
import { compareRangeEquivalencyByNumber, type DateOrDateTimeRange, type Selected } from "./date-utils";
import { rangeSetters, type TimeRangeButton } from "./range-setters";

type SidebarProps = {
  creationDate?: Date;
  setDates: (range: DateOrDateTimeRange, key: string) => void;
  selectedDates: Selected;
  floatingRangeKey?: string;
  /** Optional entry under the presets for the answer the calendar cannot express (e.g. Never). */
  nullMode?: { label: string; selected: boolean; onSelect: (selected: boolean) => void };
};

export const Sidebar = ({ creationDate, setDates, selectedDates, floatingRangeKey, nullMode }: SidebarProps) => {
  const [selectedButton, setSelectedButton] = useState<string | undefined>(floatingRangeKey);
  const [pushedDates, setPushedDates] = useState<DateOrDateTimeRange>();

  useEffect(() => {
    if (selectedDates && pushedDates && !compareRangeEquivalencyByNumber(selectedDates, pushedDates))
      setSelectedButton(undefined);
  }, [selectedDates, pushedDates]);

  const handleButtonClick = (_event: React.MouseEvent | any, button: TimeRangeButton, key: string) => {
    const newRange = button.newRange();

    setSelectedButton(key);
    setDates(button.newRange(), key);
    setPushedDates(newRange);
  };
  const buttons = rangeSetters(creationDate);

  return (
    <>
      {Object.keys(buttons).map((button: string) => (
        <Button
          key={buttons[button].id}
          id={buttons[button].id}
          align="left"
          className="border-0 m-[4px_8px] shadow-none text-body-medium font-medium"
          look={selectedButton === button ? "filled" : "string"}
          onClick={(event: any) => handleButtonClick(event, buttons[button], button)}
          data-testid={`datetime-sidebar-button-${buttons[button].id}`}
        >
          {buttons[button].name}
        </Button>
      ))}
      {nullMode && (
        <div className="flex flex-col mt-tight pt-tight border-t border-neutral-border">
          <Button
            align="left"
            className="border-0 m-[4px_8px] shadow-none text-body-medium font-medium"
            look={nullMode.selected ? "filled" : "string"}
            // Re-picking it hands the answer back to the calendar range.
            onClick={() => nullMode.onSelect(!nullMode.selected)}
            data-testid="datetime-sidebar-button-null"
          >
            {nullMode.label}
          </Button>
        </div>
      )}
    </>
  );
};
