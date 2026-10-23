import { afterEach, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

afterEach(cleanup);

it("keeps open menus in the fullscreen element so they remain visible above video", () => {
  const stage = document.createElement("div");
  document.body.append(stage);
  const descriptor = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: stage });
  try {
    render(
      <Popover open>
        <PopoverTrigger>Speed</PopoverTrigger>
        <PopoverContent>Playback rates</PopoverContent>
      </Popover>,
    );
    expect(stage.contains(screen.getByText("Playback rates"))).toBe(true);
  } finally {
    cleanup();
    stage.remove();
    if (descriptor) Object.defineProperty(document, "fullscreenElement", descriptor);
    else Reflect.deleteProperty(document, "fullscreenElement");
  }
});
