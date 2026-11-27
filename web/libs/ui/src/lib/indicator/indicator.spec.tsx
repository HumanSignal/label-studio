import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CheckIcon } from "@humansignal/icons";
import { Avatar } from "../avatar/avatar";
import { formatCount } from "./format-count";
import { Indicator } from "./indicator";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [7, "7"],
    [999, "999"],
    [1_000, "1k"],
    [1_200, "1.2k"],
    [1_999, "1.9k"],
    [100_000, "100k"],
    [999_999, "999.9k"],
    [2_500_000, "2.5M"],
    [3_000_000_000, "3B"],
  ])("shortens %d to %s", (count, text) => {
    expect(formatCount(count)).toBe(text);
  });
});

describe("Indicator", () => {
  it("names itself for screen readers and keeps the host", () => {
    render(
      <Indicator label="3 unread notifications" content={3}>
        <button type="button">Inbox</button>
      </Indicator>,
    );
    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 unread notifications" })).toHaveTextContent("3");
  });

  it("draws a dot without content, a square around an icon and a rounded count", () => {
    render(
      <>
        <Indicator label="dot">
          <span />
        </Indicator>
        <Indicator label="icon" content={<CheckIcon />}>
          <span />
        </Indicator>
        <Indicator label="count" content={4}>
          <span />
        </Indicator>
      </>,
    );
    expect(screen.getByRole("img", { name: "dot" })).toHaveAttribute("data-shape", "dot");
    expect(screen.getByRole("img", { name: "dot" })).toBeEmptyDOMElement();
    expect(screen.getByRole("img", { name: "icon" })).toHaveAttribute("data-shape", "square");
    expect(screen.getByRole("img", { name: "count" })).toHaveAttribute("data-shape", "rounded");
  });

  it("shortens large counts", () => {
    render(
      <Indicator label="1,250 unread" content={1_250}>
        <span />
      </Indicator>,
    );
    expect(screen.getByRole("img", { name: "1,250 unread" })).toHaveTextContent("1.2k");
  });

  it("drops the content of a dot", () => {
    render(
      <Indicator label="new" content={9} shape="dot">
        <span />
      </Indicator>,
    );
    expect(screen.getByRole("img", { name: "new" })).toBeEmptyDOMElement();
  });

  it("hides the mark and keeps the host when invisible", () => {
    render(
      <Indicator label="none" content={0} invisible>
        <span data-testid="host" />
      </Indicator>,
    );
    expect(screen.getByTestId("host")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "none" })).not.toBeInTheDocument();
  });

  it("sits in the corner it is given, top right by default", () => {
    render(
      <>
        <Indicator label="default">
          <span />
        </Indicator>
        <Indicator label="corner" position="bottomLeft" overlap="circular">
          <span />
        </Indicator>
      </>,
    );
    expect(screen.getByRole("img", { name: "default" })).toHaveAttribute("data-position", "topRight");
    expect(screen.getByRole("img", { name: "corner" })).toHaveAttribute("data-position", "bottomLeft");
    expect(screen.getByRole("img", { name: "corner" })).toHaveAttribute("data-overlap", "circular");
  });
});

describe("Avatar corner marks", () => {
  it("shows the indicator top right and the badge bottom right, together", () => {
    render(
      <Avatar
        username="Ana Lopez"
        indicator={{ label: "Online", variant: "positive" }}
        badge={{ label: "Accepted review", variant: "kale", icon: <CheckIcon />, "data-testid": "review" }}
      />,
    );
    const indicator = screen.getByRole("img", { name: "Online" });
    const badge = screen.getByRole("img", { name: "Accepted review" });
    expect(indicator).toHaveAttribute("data-position", "topRight");
    expect(indicator).toHaveAttribute("data-shape", "dot");
    expect(badge).toHaveAttribute("data-position", "bottomRight");
    expect(badge).toHaveAttribute("data-shape", "square");
    expect(screen.getByTestId("review")).toBe(badge);
  });

  it("draws a plain square for a badge without an icon", () => {
    render(<Avatar username="Ana Lopez" badge={{ label: "Paid", variant: "kiwi" }} />);
    const badge = screen.getByRole("img", { name: "Paid" });
    expect(badge).toHaveAttribute("data-shape", "square");
    expect(badge).toBeEmptyDOMElement();
  });
});
