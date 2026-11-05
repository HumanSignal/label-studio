import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Avatar, Userpic } from "./avatar";

describe("Avatar", () => {
  it("draws the initials of the person", () => {
    render(<Avatar user={{ id: 1, first_name: "Ada", last_name: "Lovelace" }} />);

    expect(screen.getByTestId("userpic")).toHaveTextContent("AL");
    expect(screen.getByAltText("ADA LOVELACE")).toBeInTheDocument();
  });

  it("falls back to the first two letters when there is no full name", () => {
    render(<Avatar user={{ id: 2, email: "grace@example.com" }} />);

    expect(screen.getByTestId("userpic")).toHaveTextContent("GR");
  });

  it("falls back to the first two letters when a name does not start with a letter", () => {
    render(<Avatar user={{ id: 4, first_name: "WF Owner", last_name: "01" }} />);

    expect(screen.getByTestId("userpic")).toHaveTextContent("WF");
  });

  it("keeps initials legible on small avatars", () => {
    render(<Avatar user={{ id: 3, first_name: "Ada", last_name: "Lovelace" }} size={16} />);

    expect(screen.getByTestId("userpic").style.fontSize).toBe("8px");
  });

  it("draws a count tile instead of initials", () => {
    render(<Avatar addCount="+12" />);

    expect(screen.getByTestId("userpic")).toHaveTextContent("+12");
  });

  it("keeps Userpic as an alias of the same component", () => {
    expect(Userpic).toBe(Avatar);
  });

  it("opens the name tooltip on the side it is given", () => {
    render(
      <Avatar
        user={{ id: 5, first_name: "Ada", last_name: "Lovelace" }}
        showUsernameTooltip
        tooltipAlignment="right-center"
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("userpic").parentElement as HTMLElement);
    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toHaveTextContent("Ada Lovelace");
    expect(tooltip.className).toContain("right-center");
  });

  it("is medium (24px) by default", () => {
    render(<Avatar user={{ id: 6, first_name: "Ada", last_name: "Lovelace" }} />);

    const avatar = screen.getByTestId("userpic");
    expect(avatar.style.width).toBe("24px");
    expect(avatar.style.fontSize).toBe("10px");
  });

  it.each([
    ["xsmall", "16px", "8px"],
    ["small", "20px", "8px"],
    ["medium", "24px", "10px"],
    ["large", "28px", "12px"],
    ["xlarge", "64px", "26px"],
  ] as const)("draws the %s size at %s with %s initials", (size, width, fontSize) => {
    render(<Avatar user={{ id: 7, first_name: "Ada", last_name: "Lovelace" }} size={size} />);

    const avatar = screen.getByTestId("userpic");
    expect(avatar.style.width).toBe(width);
    expect(avatar.style.height).toBe(width);
    expect(avatar.style.fontSize).toBe(fontSize);
  });
});
