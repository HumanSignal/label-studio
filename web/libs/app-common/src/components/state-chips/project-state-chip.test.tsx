import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectStateChip } from "./project-state-chip";

describe("ProjectStateChip manual Done variant", () => {
  it("looks like the regular Done chip and shows who/when in the tooltip", async () => {
    const { container } = render(
      <ProjectStateChip state="COMPLETED" interactive={false} manual={{ by: "Jane Doe", at: "Oct 26, 2026" }} />,
    );
    const { container: regular } = render(<ProjectStateChip state="COMPLETED" interactive={false} />);

    expect(container.innerHTML).toBe(regular.innerHTML);

    fireEvent.mouseEnter(screen.getAllByText("Done")[0]);
    expect(await screen.findByText("Marked as Done by Jane Doe on Oct 26, 2026")).toBeInTheDocument();
  });
});
