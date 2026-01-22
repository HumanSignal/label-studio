import { useEffect, useState } from "react";
import { Button } from "../button/button";
import { compareRangeEquivalencyByNumber, type DateOrDateTimeRange, type Selected } from "./date-utils";
import { rangeSetters, type TimeRangeButton } from "./range-setters";

type SidebarProps = {
  creationDate?: Date;
  setDates: (range: DateOrDateTimeRange, key: string) => void;
  selectedDates: Selected;
  floatingRangeKey?: string;
};

export const Sidebar = ({ creationDate, setDates, selectedDates, floatingRangeKey }: SidebarProps) => {
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
    </>
  );
};
