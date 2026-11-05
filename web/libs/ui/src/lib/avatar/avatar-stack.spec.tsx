import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AvatarStack } from "./avatar-stack";

const people = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, first_name: `User${i + 1}`, last_name: "Example" }));

const stack = (testId = "stack") => screen.getByTestId(testId);
const items = () => stack().querySelectorAll(":scope > .lsf-userpics__userpic");

describe("AvatarStack", () => {
  it("shows every avatar and no tile when the people fit", () => {
    render(<AvatarStack users={people(3)} max={4} data-testid="stack" />);

    expect(items()).toHaveLength(3);
    expect(screen.queryByTestId("avatar-stack-overflow")).not.toBeInTheDocument();
  });

  it("keeps a slot for the +N tile and counts the rest", () => {
    render(<AvatarStack users={people(7)} max={4} data-testid="stack" />);

    expect(items()).toHaveLength(4);
    expect(screen.getByTestId("avatar-stack-overflow")).toHaveTextContent("+4");
  });

  it("draws max avatars plus the tile when inclusive", () => {
    render(<AvatarStack users={people(7)} max={4} inclusive data-testid="stack" />);

    expect(items()).toHaveLength(5);
    expect(screen.getByTestId("avatar-stack-overflow")).toHaveTextContent("+3");
  });

  it("counts from the total when the list is partial", () => {
    render(<AvatarStack users={people(2)} count={10} max={4} data-testid="stack" />);

    expect(items()).toHaveLength(3);
    expect(screen.getByTestId("avatar-stack-overflow")).toHaveTextContent("+8");
  });

  it("keeps the first person first in the DOM", () => {
    render(<AvatarStack users={people(3)} data-testid="stack" />);

    const initials = Array.from(items()).map((item) => item.textContent);
    expect(initials).toEqual(["UE", "UE", "UE"]);
    expect(within(items()[0] as HTMLElement).getByAltText("USER1 EXAMPLE")).toBeInTheDocument();
  });

  it("emits exactly the class attributes automation matches, with the overlay modifier only when overlapping", () => {
    const { rerender } = render(<AvatarStack users={people(7)} overlap data-testid="stack" />);
    expect(stack().getAttribute("class")).toBe("lsf-userpics lsf-userpics_overlay");
    for (const item of Array.from(items())) expect(item.getAttribute("class")).toBe("lsf-userpics__userpic");

    rerender(<AvatarStack users={people(2)} data-testid="stack" />);
    expect(stack().getAttribute("class")).toBe("lsf-userpics");
  });

  it("gives the +N tile the same item class as every avatar so the overlap is uniform", () => {
    render(<AvatarStack users={people(7)} overlap data-testid="stack" />);

    const classes = Array.from(items()).map((item) => item.className);
    expect(new Set(classes.map((c) => c.replace(/\s+/g, " ").trim())).size).toBe(1);
    expect(screen.getByTestId("avatar-stack-overflow")).toHaveClass("lsf-userpics__userpic");
  });

  it("paints each avatar over the next, the +N tile included, so every one is cut on one side only", () => {
    render(<AvatarStack users={people(7)} overlap data-testid="stack" />);

    const layers = Array.from(items()).map((item) =>
      Number((item as HTMLElement).style.getPropertyValue("--avatar-stack-layer")),
    );
    expect(layers).toEqual([...layers].sort((a, b) => b - a));
    expect(new Set(layers).size).toBe(layers.length);
  });

  it("renders the tile as a button that calls back when asked", () => {
    const onOverflowClick = mock();
    render(<AvatarStack users={people(7)} onOverflowClick={onOverflowClick} data-testid="stack" />);

    const tile = screen.getByRole("button", { name: "Show all 7 people" });
    fireEvent.click(tile);
    expect(onOverflowClick).toHaveBeenCalledTimes(1);
  });

  it("opens the list of everyone from the tile, with a total and the names", () => {
    render(<AvatarStack users={people(7)} overflow="list" countLabel={(n) => `${n} members`} data-testid="stack" />);

    fireEvent.click(screen.getByRole("button", { name: "Show all 7 people" }));

    const list = screen.getByTestId("avatar-stack-list");
    expect(within(list).getByText("7 members")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(within(list).getByText("User7 Example")).toBeInTheDocument();
    expect(within(list).queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("adds a search to the list past the threshold and filters by name", () => {
    render(<AvatarStack users={people(12)} overflow="list" data-testid="stack" />);

    fireEvent.click(screen.getByRole("button", { name: "Show all 12 people" }));
    const list = screen.getByTestId("avatar-stack-list");
    const search = within(list).getByRole("searchbox");

    fireEvent.change(search, { target: { value: "user1" } });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getByText("4 of 12")).toBeInTheDocument();
  });

  it("tells how many are not in the list when it is partial", () => {
    render(<AvatarStack users={people(3)} count={9} overflow="list" data-testid="stack" />);

    fireEvent.click(screen.getByRole("button", { name: "Show all 9 people" }));
    const list = screen.getByTestId("avatar-stack-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("+6 more")).toBeInTheDocument();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<AvatarStack users={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
