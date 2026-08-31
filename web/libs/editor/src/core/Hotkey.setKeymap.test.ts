import defaultKeymap from "./settings/keymap.json";
import { Hotkey } from "./Hotkey";

describe("Hotkey.setKeymap", () => {
  const originalKeymap = Hotkey.keymap;

  afterEach(() => {
    Hotkey.keymap = { ...defaultKeymap } as typeof Hotkey.keymap;
  });

  afterAll(() => {
    Hotkey.keymap = originalKeymap;
  });

  it("replaces prior overrides instead of Object.assign-merging them", () => {
    const defaultSubmit = defaultKeymap["annotation:submit"];

    Hotkey.setKeymap({
      "annotation:submit": { ...defaultSubmit, key: "shift+enter" },
    } as typeof Hotkey.keymap);

    expect(Hotkey.keymap["annotation:submit"].key).toBe("shift+enter");

    // Project B applies a sparse keymap that does not mention annotation:submit
    // (account defaults / empty project override). Merge semantics would leave
    // Project A's shift+enter in place — replace semantics restore the default.
    Hotkey.setKeymap({
      "audio:playpause": { ...defaultKeymap["audio:playpause"], key: "space" },
    } as typeof Hotkey.keymap);

    expect(Hotkey.keymap["annotation:submit"].key).toBe(defaultSubmit.key);
    expect(Hotkey.keymap["audio:playpause"].key).toBe("space");
  });
});
