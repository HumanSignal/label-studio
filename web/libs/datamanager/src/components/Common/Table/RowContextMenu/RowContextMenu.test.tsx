import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { destroy, types } from "mobx-state-tree";
import { RowContextMenu } from "./RowContextMenu";

describe("RowContextMenu", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
  });

  const makeView = (toast = mock()) => {
    const View = types.model({}).volatile(() => ({
      SDK: {
        invoke: toast,
      },
      startLabeling: mock(),
    }));

    return View.create({});
  };

  const installClipboard = () => {
    const writeText = mock(async () => {});

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    return writeText;
  };

  it("copies object arrays from task data columns as JSON instead of object string placeholders", async () => {
    const writeText = installClipboard();
    const onClose = mock();
    const rankOptions = [
      { alias: "1", label: "Blocker", value: "Blocker" },
      { alias: "2", label: "Major", value: "Major" },
    ];
    const view = makeView();

    try {
      render(
        <RowContextMenu
          row={{ id: 123, rank_options: rankOptions }}
          column={{ id: "tasks:rank_options", title: "rank_options" }}
          view={view}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByText("Copy Cell Contents"));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(JSON.stringify(rankOptions, null, 2));
      });
      expect(onClose).toHaveBeenCalled();
    } finally {
      destroy(view);
    }
  });
});
