import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";

describe("ViewToggle Component", () => {
  describe("View Mode Toggle", () => {
    it("should render code and interactive view options", () => {
      render(<ViewToggle view="code" onViewChange={mock()} />);

      expect(screen.getByRole("radio", { name: "Code" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Interactive" })).toBeInTheDocument();
    });

    it("should call onViewChange when switching view modes", async () => {
      const user = userEvent.setup();
      const onViewChange = mock();

      render(<ViewToggle view="code" onViewChange={onViewChange} />);

      await user.click(screen.getByRole("radio", { name: "Interactive" }));

      expect(onViewChange).toHaveBeenCalledWith("interactive");
    });

    it("should reflect current view value", () => {
      render(<ViewToggle view="interactive" onViewChange={mock()} />);

      expect(screen.getByRole("radio", { name: "Interactive" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("radio", { name: "Code" })).toHaveAttribute("aria-checked", "false");
    });

    it("should switch from interactive to code view", async () => {
      const user = userEvent.setup();
      const onViewChange = mock();

      render(<ViewToggle view="interactive" onViewChange={onViewChange} />);

      await user.click(screen.getByRole("radio", { name: "Code" }));

      expect(onViewChange).toHaveBeenCalledWith("code");
    });
  });
});
