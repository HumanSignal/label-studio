import { afterAll, afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ff } from "@humansignal/core";
import { cn } from "../../../../utils/bem";

// AsyncPage reads the bare `location` while its module loads, which this app's test setup does not define.
globalThis.location ??= window.location;

// mock.module is process-wide in Bun, so put the real modules back once this file is done.
const realStorageProviderForm = { ...(await import("@humansignal/app-common/blocks/StorageProviderForm")) };
const realStorageForm = { ...(await import("../StorageForm")) };

afterAll(() => {
  mock.module("@humansignal/app-common/blocks/StorageProviderForm", () => realStorageProviderForm);
  mock.module("../StorageForm", () => realStorageForm);
});

mock.module("@humansignal/app-common/blocks/StorageProviderForm", () => ({
  StorageProviderForm: ({ dataTestId, title }) => <div data-testid={dataTestId}>{title}</div>,
}));

mock.module("../StorageForm", () => ({
  StorageForm: () => <div data-testid="legacy-storage-form" />,
}));

const { StorageSet } = await import("../StorageSet");

const renderStorageSet = () =>
  render(
    <StorageSet
      title="Source Cloud Storage"
      target="import"
      rootClass={cn("storage-settings")}
      buttonLabel="Add Source Storage"
      storageTypes={[{ name: "s3", title: "AWS S3" }]}
      storages={[]}
      storagesLoaded
      loading={false}
      loaded
      fetchStorages={() => {}}
    />,
  );

const openAddSourceStorage = () => fireEvent.click(screen.getByTestId("add-source-storage-button"));

describe("StorageSet storage dialog", () => {
  afterEach(() => {
    cleanup();
    mock.restore();
  });

  it("opens the storage wizard as its own dialog, not inside another one", () => {
    spyOn(ff, "isActive").mockImplementation((flag) => flag === ff.FF_NEW_STORAGES);
    renderStorageSet();

    expect(screen.queryByTestId("storage-form-modal")).toBeNull();
    openAddSourceStorage();

    expect(screen.getByTestId("storage-form-modal")).toHaveTextContent("Connect Source Storage");
    expect(document.querySelector('[data-slot="modal-window-body"]')).toBeNull();
  });

  it("keeps the legacy storage form inside the default dialog", () => {
    spyOn(ff, "isActive").mockReturnValue(false);
    renderStorageSet();

    openAddSourceStorage();

    const body = screen.getByTestId("storage-form-modal").querySelector('[data-slot="modal-window-body"]');
    expect(body).toContainElement(screen.getByTestId("legacy-storage-form"));
    expect(body.className).toContain("px-wide");
  });
});
