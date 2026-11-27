/**
 * Contract tests for the interaction between RandomizableMixin and
 * `Annotation.setupHotKeys()` pass-3 auto-assignment. The contract:
 *
 *   - The host owns the shuffle lifecycle; by the time pass-3 runs,
 *     `displayChildren` already reflects the order to render in.
 *   - Pass-3 walks `displayChildren` and assigns hotkeys only to children
 *     without one, so repeated calls on the same MST are idempotent.
 *   - Children with an explicit hotkey (config or previous pass) are left
 *     alone.
 */
import { unprotect } from "mobx-state-tree";
import "../../tags/control/Choices";
import { ChoicesModel } from "../../tags/control/Choices";

/**
 * Stand-in for the global hotkeys context. `makeComb` mirrors the real
 * implementation in `core/Hotkey.ts`.
 */
function createHotkeysContext() {
  const taken = new Set();
  const bindings = new Map();
  const ALPHABET = "1234567890qwetasdfgzxcvbyiopjklnm".split("");
  return {
    makeComb() {
      for (const ch of ALPHABET) {
        if (!taken.has(ch)) {
          taken.add(ch);
          return ch;
        }
      }
      return null;
    },
    addKey(key, handler) {
      bindings.set(key, handler);
    },
    markExplicit(key) {
      taken.add(key);
    },
    bindings,
  };
}

/**
 * Mirrors the pass-3 randomize loop in `Annotation.setupHotKeys()` so the
 * mixin's surface is exercised the same way the real call site uses it.
 */
function runRandomizePassForNode(node, hotkeys) {
  if (!(node && node.randomize === true && typeof node.reshuffle === "function")) return false;
  for (const child of node.displayChildren ?? []) {
    if (child?.onHotKey && !child.hotkey) {
      const comb = hotkeys.makeComb();
      if (!comb) break;
      child.hotkey = comb;
      hotkeys.addKey(child.hotkey, child.onHotKey);
    }
  }
  return true;
}

/**
 * Construct a Choices model. The initial shuffle happens in
 * `Choices.afterCreate`, so callers wanting a known order must stub
 * `Math.random` BEFORE calling this helper.
 */
function makeChoices({ randomize = true, children } = {}) {
  const choices = ChoicesModel.create({
    name: "ch",
    toname: "t",
    choice: "single",
    randomize,
    children: children ?? [
      { type: "choice", value: "Positive", _value: "Positive" },
      { type: "choice", value: "Neutral", _value: "Neutral" },
      { type: "choice", value: "Negative", _value: "Negative" },
    ],
  });
  // Allow direct `child.hotkey = ...` assignment outside an MST action.
  unprotect(choices);
  return choices;
}

describe("Annotation.setupHotKeys pass-3 randomize contract", () => {
  it("assigns auto-hotkeys to randomized Choices children in displayChildren order", () => {
    // Stubbing Math.random=0 makes Fisher-Yates over [Positive, Neutral, Negative]
    // collapse to [Neutral, Negative, Positive].
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choices = makeChoices();
      const hotkeys = createHotkeysContext();

      const handled = runRandomizePassForNode(choices, hotkeys);
      expect(handled).toBe(true);

      const display = choices.displayChildren;
      expect(display.map((c) => c._value)).toEqual(["Neutral", "Negative", "Positive"]);
      expect(display[0].hotkey).toBe("1");
      expect(display[1].hotkey).toBe("2");
      expect(display[2].hotkey).toBe("3");

      // Bindings reach the handler on the right MST node, not the right position.
      expect(hotkeys.bindings.get("1")).toBe(display[0].onHotKey);
      expect(hotkeys.bindings.get("2")).toBe(display[1].onHotKey);
      expect(hotkeys.bindings.get("3")).toBe(display[2].onHotKey);
    } finally {
      spy.mockRestore();
    }
  });

  it("honors explicit hotkey on a child and assigns siblings around it", () => {
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choices = makeChoices({
        children: [
          { type: "choice", value: "Positive", _value: "Positive" },
          { type: "choice", value: "Neutral", _value: "Neutral", hotkey: "q" },
          { type: "choice", value: "Negative", _value: "Negative" },
        ],
      });
      const hotkeys = createHotkeysContext();
      // Simulate pass 1: the explicit-hotkey pass has already bound "q".
      hotkeys.markExplicit("q");

      runRandomizePassForNode(choices, hotkeys);

      // Find the Neutral child (the explicit one) and confirm it kept "q".
      const neutral = choices.children.find((c) => c._value === "Neutral");
      expect(neutral.hotkey).toBe("q");

      // The other two siblings get the next two free keys in display order.
      const display = choices.displayChildren;
      const autoChildren = display.filter((c) => c !== neutral);
      expect(autoChildren.map((c) => c.hotkey)).not.toContain("q");
      autoChildren.forEach((c) => expect(c.hotkey).toMatch(/^[a-z0-9]$/));
      expect(autoChildren[0].hotkey).not.toBe(autoChildren[1].hotkey);
    } finally {
      spy.mockRestore();
    }
  });

  it("two randomized Choices share the global hotkey pool", () => {
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choicesA = makeChoices({
        children: [
          { type: "choice", value: "A1", _value: "A1" },
          { type: "choice", value: "A2", _value: "A2" },
        ],
      });
      const choicesB = makeChoices({
        children: [
          { type: "choice", value: "B1", _value: "B1" },
          { type: "choice", value: "B2", _value: "B2" },
        ],
      });
      const hotkeys = createHotkeysContext();
      runRandomizePassForNode(choicesA, hotkeys);
      runRandomizePassForNode(choicesB, hotkeys);

      const allHotkeys = [
        ...choicesA.displayChildren.map((c) => c.hotkey),
        ...choicesB.displayChildren.map((c) => c.hotkey),
      ];
      expect(new Set(allHotkeys).size).toBe(4);
      expect(choicesA.displayChildren.map((c) => c.hotkey)).toEqual(["1", "2"]);
      expect(choicesB.displayChildren.map((c) => c.hotkey)).toEqual(["3", "4"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("non-randomized parent is skipped by the randomize branch", () => {
    const choices = makeChoices({ randomize: false });
    const hotkeys = createHotkeysContext();
    const handled = runRandomizePassForNode(choices, hotkeys);
    expect(handled).toBe(false);
    choices.children.forEach((c) => expect(c.hotkey).toBeNull());
  });

  it("is idempotent across repeated passes on the same MST root", () => {
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choices = makeChoices();
      const hotkeys = createHotkeysContext();

      runRandomizePassForNode(choices, hotkeys);

      const firstDisplay = choices.displayChildren;
      const firstOrder = firstDisplay.map((c) => c._value);
      const firstHotkeys = firstDisplay.map((c) => c.hotkey);
      expect(firstHotkeys).toEqual(["1", "2", "3"]);

      // Drive a second pass. The real call site reserves already-assigned
      // hotkeys via pass 1 before the auto-assign pass runs.
      const hotkeys2 = createHotkeysContext();
      for (const child of choices.children) {
        if (child.hotkey) hotkeys2.markExplicit(child.hotkey);
      }
      runRandomizePassForNode(choices, hotkeys2);

      expect(choices.displayChildren.map((c) => c._value)).toEqual(firstOrder);
      expect(choices.displayChildren.map((c) => c.hotkey)).toEqual(firstHotkeys);
      expect(hotkeys2.bindings.size).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });
});
