import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiContext } from "@humansignal/core";
import { z } from "zod";
import type { ProviderConfig } from "./types/provider";

globalThis.location ??= window.location;

const { StorageProviderForm } = await import("./index");

const providers: Record<string, ProviderConfig> = {
  s3: {
    name: "s3",
    title: "Amazon S3",
    description: "",
    fields: [{ name: "bucket", type: "text", label: "Bucket", required: true, schema: z.string() }],
    layout: [{ fields: ["bucket"] }],
  },
};

const renderForm = (onClose = mock(), api: Record<string, unknown> = {}) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiContext.Provider value={{ callApi: mock(), ...api } as any}>
        <StorageProviderForm
          title="Add Source Storage"
          target="import"
          project={1}
          storageTypes={[{ name: "s3", title: "Amazon S3" }]}
          providers={providers}
          dataTestId="storage-form-modal"
          onSubmit={mock()}
          onClose={onClose}
        />
      </ApiContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
};

describe("StorageProviderForm dialog", () => {
  it("uses the dialog header for the title and description", () => {
    renderForm();

    const dialog = screen.getByTestId("storage-form-modal");
    const header = dialog.querySelector('[data-slot="modal-window-header"]');

    expect(header).toHaveTextContent("Add Source Storage");
    expect(header).toHaveTextContent("Import your data from cloud storage providers");
  });

  it("puts the wizard actions in the dialog footer, outside the scrolling body", () => {
    renderForm();

    const footer = screen.getByTestId("modal-window-footer");
    const body = screen.getByTestId("storage-form-modal").querySelector('[data-slot="modal-window-body"]');

    expect(within(footer).getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(within(body as HTMLElement).queryByRole("button", { name: "Next" })).toBeNull();
    expect(within(body as HTMLElement).getByTestId("storage-provider-form-stepper")).toBeInTheDocument();
  });

  it("closes from the dialog close button", () => {
    const onClose = renderForm();

    fireEvent.click(screen.getByTestId("modal-window-close-button"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a failed connection test as a design-system error message", () => {
    renderForm(mock(), {
      error: { error: "Bad Request" },
      errorFormatter: () => ({
        message: "Bad Request",
        validation: [["non_field_errors", ["Cannot connect to S3 my-bucket with specified AWS credentials"]]],
      }),
    });

    const error = screen.getByTestId("storage-form-error");
    expect(error.className).toContain("message");
    expect(error).toHaveTextContent("Cannot connect to S3 my-bucket with specified AWS credentials");
    expect(document.querySelector(".lsf-inline-error")).toBeNull();
  });
});
