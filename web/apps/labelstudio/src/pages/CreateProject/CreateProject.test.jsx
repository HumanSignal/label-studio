import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// AsyncPage reads the bare `location` while its module loads, which this app's test setup does not define.
globalThis.location ??= window.location;

const ApiProviderModule = await import("../../providers/ApiProvider");
const ConfigModule = await import("./Config/Config");
const ImportModule = await import("./Import/Import");
const UseImportPageModule = await import("./Import/useImportPage");
const UseDraftProjectModule = await import("./utils/useDraftProject");
const { CreateProject } = await import("./CreateProject");

const project = { id: 5, title: "Draft project" };

describe("CreateProject", () => {
  let callApi;

  beforeEach(() => {
    window.__lsa = mock();
    callApi = mock(async () => ({ ok: true }));
    spyOn(ApiProviderModule, "useAPI").mockReturnValue({ callApi });
    spyOn(UseDraftProjectModule, "useDraftProject").mockReturnValue({ project, setProject: mock() });
    spyOn(UseImportPageModule, "useImportPage").mockReturnValue({
      columns: [],
      uploading: false,
      uploadDisabled: false,
      finishUpload: mock(async () => true),
      pageProps: {},
      uploadSample: mock(),
    });
    spyOn(ImportModule, "ImportPage").mockImplementation(() => null);
    spyOn(ConfigModule, "ConfigPage").mockImplementation(() => null);
  });

  const renderPage = (onClose = mock()) => {
    render(
      <MemoryRouter>
        <CreateProject onClose={onClose} />
      </MemoryRouter>,
    );
    return onClose;
  };

  it("opens as a fullscreen dialog with its own header", () => {
    renderPage();

    const dialog = screen.getByTestId("create-project-modal");
    expect(dialog).toHaveTextContent("Create Project");
    expect(screen.getByRole("button", { name: "Cancel project creation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByTestId("modal-window-close-button")).toBeNull();
  });

  it("deletes the draft and closes on Cancel", async () => {
    const onClose = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Cancel project creation" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(callApi).toHaveBeenCalledWith("deleteProject", { params: { pk: 5 } });
  });

  it("deletes the draft and closes on Escape", async () => {
    const onClose = renderPage();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(callApi).toHaveBeenCalledWith("deleteProject", { params: { pk: 5 } });
  });

  it("keeps the draft when an editor inside used Escape", async () => {
    const onClose = renderPage();
    const nameInput = screen.getByTestId("create-project-modal").querySelector("input");
    nameInput.addEventListener("keydown", (event) => event.stopPropagation());

    fireEvent.keyDown(nameInput, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("create-project-modal")).toBeInTheDocument();
  });
});
