import { fireEvent, render, screen } from "@testing-library/react";

import {
  ProfileDirtyProvider,
  useDiscardProfileDrafts,
  useProfileFormsDirty,
  useReportProfileDirty,
} from "./ProfileDirtyContext";

const DirtyReadout = () => {
  const anyDirty = useProfileFormsDirty();
  return <div data-testid="readout">{anyDirty ? "dirty" : "clean"}</div>;
};

const Reporter = ({ dirty, onDiscard }: { dirty: boolean; onDiscard?: () => void }) => {
  useReportProfileDirty(dirty, onDiscard);
  return null;
};

const DiscardButton = () => {
  const discard = useDiscardProfileDrafts();
  return <button onClick={discard}>Discard</button>;
};

describe("ProfileDirtyContext", () => {
  it("is clean when no form reports unsaved changes", () => {
    render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={false} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");
  });

  it("becomes dirty when any form reports unsaved changes", () => {
    const { rerender } = render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={false} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");

    rerender(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={true} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");
  });

  it("stays dirty while at least one of several forms is dirty", () => {
    const { rerender } = render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={true} />
        <Reporter dirty={true} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

    // One form saved (clean), the other still dirty → page is still dirty.
    rerender(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={false} />
        <Reporter dirty={true} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

    // Both clean → page is clean.
    rerender(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={false} />
        <Reporter dirty={false} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");
  });

  it("clears all registered dirty flags and calls discard handlers", () => {
    const discardDirtyForm = mock();
    const discardCleanForm = mock();

    render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={true} onDiscard={discardDirtyForm} />
        <Reporter dirty={false} onDiscard={discardCleanForm} />
        <DiscardButton />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(discardDirtyForm).toHaveBeenCalledTimes(1);
    expect(discardCleanForm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("readout")).toHaveTextContent("clean");
  });

  it("clears a form's dirty flag and discard handler when it unmounts", () => {
    const discard = mock();
    const { rerender } = render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={true} onDiscard={discard} />
        <DiscardButton />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

    rerender(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <DiscardButton />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(discard).not.toHaveBeenCalled();
  });

  it("is a no-op outside of a provider", () => {
    expect(() =>
      render(
        <>
          <DirtyReadout />
          <Reporter dirty={true} />
        </>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");
  });
});
