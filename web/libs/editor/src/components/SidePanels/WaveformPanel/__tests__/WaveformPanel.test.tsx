import { fireEvent, render } from "@testing-library/react";

import { slots } from "../../../../tags/object/Audio/float";
import { WaveformComponent } from "../WaveformPanel";

const entered: HTMLElement[] = [];

mockModule("../../../../hooks/useFullscreen", () => ({
  useFullscreen: () => ({
    enter: (el: HTMLElement) => entered.push(el),
    exit: () => {},
    getElement: () => null,
  }),
}));

const makeSlot = (name: string) => {
  const home = document.createElement("div");
  const host = document.createElement("div");

  host.dataset.name = name;
  home.appendChild(host);
  document.body.appendChild(home);
  slots.set(name, { host, home });
  return { host, home };
};

describe("WaveformPanel", () => {
  afterEach(() => slots.clear());

  it("takes the host out of its home", () => {
    const { host, home } = makeSlot("audio");
    const { container } = render(<WaveformComponent {...({} as any)} />);

    expect(host.parentElement).not.toBe(home);
    expect(container.contains(host)).toBe(true);
  });

  it("gives the host back when the panel closes", () => {
    const { host, home } = makeSlot("audio");
    const { unmount } = render(<WaveformComponent {...({} as any)} />);

    unmount();
    expect(host.parentElement).toBe(home);
  });

  it("never recreates the host, so the waveform is not reloaded", () => {
    const { host } = makeSlot("audio");
    const { unmount } = render(<WaveformComponent {...({} as any)} />);

    unmount();
    render(<WaveformComponent {...({} as any)} />);
    expect(slots.get("audio")!.host).toBe(host);
  });

  it("takes every audio tag on the task", () => {
    const a = makeSlot("a");
    const b = makeSlot("b");
    const { container } = render(<WaveformComponent {...({} as any)} />);

    expect(container.contains(a.host)).toBe(true);
    expect(container.contains(b.host)).toBe(true);
  });

  it("keeps the host when a second panel already took it", () => {
    const { host, home } = makeSlot("audio");
    const first = render(<WaveformComponent {...({} as any)} />);
    const second = render(<WaveformComponent {...({} as any)} />);

    first.unmount();
    expect(host.parentElement).not.toBe(home);
    expect(second.container.contains(host)).toBe(true);
  });

  it("asks for fullscreen on the panel root", () => {
    makeSlot("audio");
    const { container } = render(<WaveformComponent {...({} as any)} />);

    fireEvent.click(container.querySelector("button")!);
    expect(entered.at(-1)).toBe(container.firstElementChild);
  });
});
