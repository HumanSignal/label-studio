import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CheckIcon } from "@humansignal/icons";
import { Avatar } from "./avatar";
import { AvatarBadge } from "./avatar-badge";

const ada = { id: 1, first_name: "Ada", last_name: "Lovelace" };

describe("AvatarBadge", () => {
  it("names its meaning for screen readers and carries its variant", () => {
    render(<AvatarBadge label="Accepted review" variant="positive" icon={<CheckIcon />} />);

    const badge = screen.getByRole("img", { name: "Accepted review" });
    expect(badge).toHaveAttribute("data-variant", "positive");
    expect(badge.querySelector("svg")).toBeInTheDocument();
  });

  it("draws no icon on a dot", () => {
    render(<AvatarBadge label="Unread notifications" shape="dot" icon={<CheckIcon />} />);

    expect(screen.getByRole("img", { name: "Unread notifications" }).querySelector("svg")).toBeNull();
  });

  it("sits in the avatar's bottom-right corner unless told otherwise", () => {
    const { rerender } = render(<Avatar user={ada} badge={<AvatarBadge label="Paid" />} />);
    const corner = () => screen.getByRole("img", { name: "Paid" }).parentElement as HTMLElement;
    expect(corner().className).toContain("bottomRight");
    expect(screen.getByTestId("userpic")).toContainElement(corner());

    rerender(<Avatar user={ada} badge={<AvatarBadge label="Paid" />} badgePosition="topRight" />);
    expect(corner().className).toContain("topRight");
  });

  it("renders no corner when there is no badge", () => {
    render(<Avatar user={ada} badge={null} />);

    expect(screen.getByTestId("userpic").querySelector('[role="img"]')).toBeNull();
  });
});
