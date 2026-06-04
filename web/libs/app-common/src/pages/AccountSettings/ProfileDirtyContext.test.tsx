import { render, screen } from "@testing-library/react";

import { ProfileDirtyProvider, useProfileFormsDirty, useReportProfileDirty } from "./ProfileDirtyContext";

const DirtyReadout = () => {
  const anyDirty = useProfileFormsDirty();
  return <div data-testid="readout">{anyDirty ? "dirty" : "clean"}</div>;
};

const Reporter = ({ dirty }: { dirty: boolean }) => {
  useReportProfileDirty(dirty);
  return null;
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

  it("clears a form's dirty flag when it unmounts", () => {
    const { rerender } = render(
      <ProfileDirtyProvider>
        <DirtyReadout />
        <Reporter dirty={true} />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

    rerender(
      <ProfileDirtyProvider>
        <DirtyReadout />
      </ProfileDirtyProvider>,
    );

    expect(screen.getByTestId("readout")).toHaveTextContent("clean");
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
