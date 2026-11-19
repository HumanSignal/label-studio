import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import { ConfigContext } from "../../providers/ConfigProvider";

// AsyncPage reads the bare `location` while its module loads, which this app's test setup does not define.
globalThis.location ??= window.location;
const { AsyncPage } = await import("./AsyncPage");

describe("AsyncPage load errors", () => {
  let history;
  let fetchSpy;
  let page = 0;

  const renderPage = () => {
    history = createMemoryHistory();
    page += 1;
    return render(
      <Router history={history}>
        <ConfigContext.Provider value={{ update: mock() }}>
          <AsyncPage>
            <a href={`/async-page-${page}`} data-testid="link">
              go
            </a>
            <a href={`/async-page-${page}-other`} data-testid="other-link">
              go elsewhere
            </a>
          </AsyncPage>
        </ConfigContext.Provider>
      </Router>,
    );
  };

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it("shows no dialog until a page fails to load", () => {
    renderPage();

    expect(screen.queryByTestId("page-error-dialog")).toBeNull();
  });

  it("shows the status, an error id and the response when the server answers with an error", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response("<h1>Boom</h1>", { status: 500, statusText: "Internal Server Error" }),
    );
    renderPage();

    fireEvent.click(screen.getByTestId("link"));

    const dialog = await screen.findByTestId("page-error-dialog");
    expect(dialog).toHaveTextContent("Error 500: Internal Server Error");
    expect(dialog).toHaveTextContent("Error ID: 500");
    expect(dialog).toHaveTextContent("Cannot load url");
    expect(dialog).toHaveTextContent(`/async-page-${page}`);
    expect(history.location.pathname).toBe("/");
  });

  it("says the server is not responding when the request itself fails", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    renderPage();

    fireEvent.click(screen.getByTestId("link"));

    const dialog = await screen.findByTestId("page-error-dialog");
    expect(dialog).toHaveTextContent("Connection refused");
    expect(dialog).toHaveTextContent("Server not responding. Is it still running?");
    expect(history.location.pathname).toBe("/");
  });

  it("cannot be dismissed, as before", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    renderPage();
    fireEvent.click(screen.getByTestId("link"));
    await screen.findByTestId("page-error-dialog");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(screen.getByTestId("page-error-dialog")).toHaveTextContent("Connection refused");
    expect(screen.queryByTestId("modal-window-close-button")).toBeNull();
  });

  it("keeps the first error when another page fails after it", async () => {
    const responses = [
      () => new Response("first", { status: 500, statusText: "Internal Server Error" }),
      () => new Response("second", { status: 502, statusText: "Bad Gateway" }),
    ];
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => (responses.shift() ?? responses[0])());
    renderPage();

    fireEvent.click(screen.getByTestId("link"));
    await screen.findByTestId("page-error-dialog");
    fireEvent.click(screen.getByTestId("other-link"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(screen.getAllByTestId("page-error-dialog")).toHaveLength(1);
    expect(screen.getByTestId("page-error-dialog")).toHaveTextContent("Error 500: Internal Server Error");
  });
});
