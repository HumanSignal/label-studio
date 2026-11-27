import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as codeViewModule from "./CodeView";
import { TaskSourceDialog } from "./TaskSourceDialog";

const source = {
  task: { id: 42, data: { text: "Hello" }, annotations: [], predictions: [] },
  onTaskLoad: mock(async () => ({ id: 42, data: { text: "Hello" } })),
};

describe("TaskSourceDialog", () => {
  beforeEach(() => {
    spyOn(codeViewModule, "CodeView").mockImplementation(() => <div data-testid="code-view" />);
  });

  afterEach(() => {
    restoreAllMocks();
  });

  it("shows the task's source with its title and the view toggle in the header", async () => {
    render(<TaskSourceDialog source={source} onClose={() => {}} />);

    const dialog = await screen.findByTestId("task-source-modal");
    expect(screen.getByRole("dialog", { name: "Source for task 42" })).toBe(dialog);
    expect(screen.getByTestId("modal-window-header")).toHaveTextContent("Source for task 42");
    await waitFor(() => expect(screen.getByTestId("modal-window-header").querySelector("button")).not.toBeNull());
  });

  it("stays closed without a task and reports the close", async () => {
    const onClose = mock();
    const { rerender } = render(<TaskSourceDialog source={null} onClose={onClose} />);
    expect(screen.queryByTestId("task-source-modal")).not.toBeInTheDocument();

    rerender(<TaskSourceDialog source={source} onClose={onClose} />);
    fireEvent.click(await screen.findByTestId("modal-window-close-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
