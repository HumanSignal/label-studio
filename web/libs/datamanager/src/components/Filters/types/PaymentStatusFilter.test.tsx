import { render, screen } from "@testing-library/react";
import * as uiModule from "@humansignal/ui";
// @ts-expect-error -- Legacy JavaScript filter registry has no declaration file.
import { PaymentStatus } from "./index";

describe("PaymentStatus filter", () => {
  beforeEach(() => {
    spyOn(uiModule, "Select").mockImplementation(({ options, onChange }: any) => (
      <button type="button" onClick={() => onChange(options[0].value)}>
        {options.map((option: { textLabel: string }) => option.textLabel).join(", ")}
      </button>
    ));
  });

  it("renders server-provided status options and emits their stored values", () => {
    const onChange = mock();
    const Input = PaymentStatus[0].input;
    const schema = {
      items: [
        { value: "approved", title: "Approved from database" },
        { value: "in_payout", title: "In payout from database" },
      ],
      multiple: false,
    };

    render(<Input schema={schema} value={null} onChange={onChange} />);

    expect(screen.getByRole("button")).toHaveTextContent("Approved from database, In payout from database");
    screen.getByRole("button").click();
    expect(onChange).toHaveBeenCalledWith("approved");
  });

  it("only offers exact status-match operators", () => {
    expect(PaymentStatus.map(({ key }: { key: string }) => key)).toEqual(["contains", "not_contains"]);
  });
});
