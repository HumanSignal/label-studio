/**
 * Unit tests for Choice tag (tags/control/Choice.jsx)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { types, unprotect } from "mobx-state-tree";
import { HtxChoice } from "../Choice";
import { ChoicesModel } from "../Choices";

mockModule("../../../core/Tree", () => {
  const actualModule = requireActual("../../../core/Tree");
  const actual = actualModule.default ?? actualModule;
  const treeMock = {
    ...actual,
    cssConverter: (style) => {
      if (!style) return null;
      const result = {};
      style.split(";").forEach((part) => {
        const idx = part.indexOf(":");
        if (idx !== -1)
          result[
            part
              .slice(0, idx)
              .trim()
              .replace(/-./g, (x) => x[1].toUpperCase())
          ] = part.slice(idx + 1).trim();
      });
      return result;
    },
    renderChildren: () => null,
  };
  return {
    __esModule: true,
    __skipMerge: true,
    ...treeMock,
    default: treeMock,
  };
});

beforeEach(() => {
  window.STORE_INIT_OK = true;
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("Choice model", () => {
  it("creates choice under Choices with correct defaults", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      layout: "vertical",
      children: [
        { type: "choice", value: "A", _value: "A" },
        { type: "choice", value: "B", _value: "B" },
      ],
    });
    const choiceA = choices.children[0];
    expect(choiceA.type).toBe("choice");
    expect(choiceA._value).toBe("A");
    expect(choiceA.parent).toBe(choices);
    expect(choiceA.isCheckbox).toBe(true);
    expect(choiceA.isSelect).toBe(false);
    expect(choiceA.isLeaf).toBe(true);
    expect(choiceA.sel).toBe(false);
    expect(choiceA.indeterminate).toBe(false);
    expect(choiceA.canBeUsed()).toBe(true);
    expect(choiceA.isIndependent).toBe(true);
  });

  it("resultValue returns _resultValue for non-nested", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "Opt", _value: "Opt" }],
    });
    const choice = choices.children[0];
    expect(choice._resultValue).toBe("Opt");
    expect(choice.resultValue).toBe("Opt");
  });

  it("resultValue uses alias when set", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "Display", alias: "val", _value: "Display" }],
    });
    const choice = choices.children[0];
    expect(choice._resultValue).toBe("val");
    expect(choice.resultValue).toBe("val");
  });

  it("setSelected updates _sel and propagates to children", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: true,
      children: [
        {
          type: "choice",
          value: "Parent",
          _value: "Parent",
          children: [
            { type: "choice", value: "Child1", _value: "Child1" },
            { type: "choice", value: "Child2", _value: "Child2" },
          ],
        },
      ],
    });
    const parentChoice = choices.children[0];
    const child1 = parentChoice.children[0];
    const child2 = parentChoice.children[1];
    expect(parentChoice.isLeaf).toBe(false);
    expect(parentChoice.sel).toBe(false);
    parentChoice.setSelected(true);
    expect(parentChoice._sel).toBe(true);
    expect(child1._sel).toBe(true);
    expect(child2._sel).toBe(true);
    parentChoice.setSelected(false);
    expect(parentChoice._sel).toBe(false);
    expect(child1._sel).toBe(false);
    expect(child2._sel).toBe(false);
  });

  it("sel aggregates children when not leaf", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: true,
      children: [
        {
          type: "choice",
          value: "P",
          _value: "P",
          children: [
            { type: "choice", value: "C1", _value: "C1" },
            { type: "choice", value: "C2", _value: "C2" },
          ],
        },
      ],
    });
    const parent = choices.children[0];
    parent.children[0].setSelected(true);
    parent.children[1].setSelected(false);
    expect(parent.sel).toBe(false);
    expect(parent.indeterminate).toBe(true);
    parent.children[1].setSelected(true);
    expect(parent.sel).toBe(true);
    expect(parent.indeterminate).toBe(false);
  });

  it("setVisible updates visible", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "V", _value: "V" }],
    });
    const choice = choices.children[0];
    expect(choice.visible).toBe(true);
    choice.setVisible(false);
    expect(choice.visible).toBe(false);
  });

  it("toggleSelected flips _sel when parent updateResult is no-op", () => {
    const Root = types
      .model({
        choices: ChoicesModel,
      })
      .volatile(() => ({
        annotationStore: { selected: { isReadOnly: () => false } },
      }));
    const root = Root.create({
      choices: {
        name: "ch",
        toname: "t",
        choice: "single",
        children: [{ type: "choice", value: "T", _value: "T" }],
      },
    });
    root.choices.updateResult = () => {};
    const choice = root.choices.children[0];
    expect(choice.sel).toBe(false);
    choice.toggleSelected();
    expect(choice.sel).toBe(true);
    choice.toggleSelected();
    expect(choice.sel).toBe(false);
  });

  it("isReadOnly returns true when choice readonly", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "R", _value: "R", readonly: true }],
    });
    const choice = choices.children[0];
    expect(choice.isReadOnly()).toBe(true);
  });

  it("nestedResults follows parent allownested", () => {
    const choicesAllow = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: true,
      children: [{ type: "choice", value: "N", _value: "N" }],
    });
    const choicesDisallow = ChoicesModel.create({
      name: "ch2",
      toname: "t",
      choice: "multiple",
      allownested: false,
      children: [{ type: "choice", value: "M", _value: "M" }],
    });
    expect(choicesAllow.children[0].nestedResults).toBe(true);
    expect(choicesDisallow.children[0].nestedResults).toBe(false);
  });

  it("isCheckbox true for single or multiple", () => {
    const single = ChoicesModel.create({
      name: "c",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "S", _value: "S" }],
    });
    const multiple = ChoicesModel.create({
      name: "c2",
      toname: "t",
      choice: "multiple",
      children: [{ type: "choice", value: "M", _value: "M" }],
    });
    expect(single.children[0].isCheckbox).toBe(true);
    expect(multiple.children[0].isCheckbox).toBe(true);
  });

  it("isSelect true when parent layout is select", () => {
    const choices = ChoicesModel.create({
      name: "c",
      toname: "t",
      choice: "single",
      layout: "select",
      children: [{ type: "choice", value: "S", _value: "S" }],
    });
    expect(choices.children[0].isSelect).toBe(true);
  });

  it("resultValue returns array for nested when has parentChoice", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: true,
      children: [
        {
          type: "choice",
          value: "P",
          _value: "P",
          children: [{ type: "choice", value: "C", _value: "C" }],
        },
      ],
    });
    const child = choices.children[0].children[0];
    expect(child.resultValue).toEqual(["P", "C"]);
  });

  it("isSkipped is true when nestedResults false and has parentChoice", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: false,
      children: [
        {
          type: "choice",
          value: "P",
          _value: "P",
          children: [{ type: "choice", value: "C", _value: "C" }],
        },
      ],
    });
    const child = choices.children[0].children[0];
    expect(child.nestedResults).toBe(false);
    expect(child.parentChoice).toBeTruthy();
    expect(child.isSkipped).toBe(true);
  });

  it("onHotKey calls toggleSelected when parent type is choices", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      children: [{ type: "choice", value: "H", _value: "H" }],
    });
    choices.updateResult = () => {};
    const choice = choices.children[0];
    expect(choice.onHotKey).toBeDefined();
    expect(choice.sel).toBe(false);
    choice.onHotKey();
    expect(choice.sel).toBe(true);
  });
});

describe("Choices randomize (RandomizableMixin)", () => {
  function makeChoices({ randomize = false } = {}) {
    return ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      randomize,
      children: [
        { type: "choice", value: "A", _value: "A" },
        { type: "choice", value: "B", _value: "B" },
        { type: "choice", value: "C", _value: "C" },
      ],
    });
  }

  it("randomize defaults to false and displayChildren matches tiedChildren order", () => {
    const choices = makeChoices();
    expect(choices.randomize).toBe(false);
    expect(choices.displayChildren.map((c) => c._value)).toEqual(choices.tiedChildren.map((c) => c._value));
  });

  it("reshuffle is a no-op when randomize is false", () => {
    const choices = makeChoices();
    choices.reshuffle();
    expect(choices._shuffledChildren).toBeNull();
    expect(choices.displayChildren.map((c) => c._value)).toEqual(choices.tiedChildren.map((c) => c._value));
  });

  it("afterCreate establishes a stable shuffled snapshot when randomize=true", () => {
    // Math.random=0 collapses Fisher-Yates over [A,B,C] to [B,C,A].
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choices = makeChoices({ randomize: true });
      expect(choices._shuffledChildren).not.toBeNull();
      expect(choices.displayChildren.map((c) => c._value)).toEqual(["B", "C", "A"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("displayChildren falls back to tiedChildren when the shuffled snapshot is cleared", () => {
    const choices = makeChoices({ randomize: true });
    unprotect(choices);
    choices._shuffledChildren = null;
    expect(choices.displayChildren.map((c) => c._value)).toEqual(choices.tiedChildren.map((c) => c._value));
  });

  it("reshuffle produces a deterministic permutation with a stubbed Math.random", () => {
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      const choices = makeChoices({ randomize: true });
      choices.reshuffle();
      const values = choices.displayChildren.map((c) => c._value);
      expect(values).toEqual(["B", "C", "A"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("reshuffle returns a different order on a different stubbed sequence", () => {
    const spy = spyOn(Math, "random").mockReturnValue(0.99);
    try {
      const choices = makeChoices({ randomize: true });
      choices.reshuffle();
      const values = choices.displayChildren.map((c) => c._value);
      expect(values).toEqual(["A", "B", "C"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("displayChildren is a permutation of tiedChildren (same set, same length)", () => {
    const choices = makeChoices({ randomize: true });
    choices.reshuffle();
    const display = choices.displayChildren;
    const tied = choices.tiedChildren;
    expect(display).not.toBe(tied);
    expect(display.length).toBe(tied.length);
    expect(new Set(display)).toEqual(new Set(tied));
  });

  it("serialization is unaffected by display order (resultValue matches config value/alias)", () => {
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "single",
      randomize: true,
      children: [
        { type: "choice", value: "Positive", alias: "pos", _value: "Positive" },
        { type: "choice", value: "Neutral", _value: "Neutral" },
        { type: "choice", value: "Negative", _value: "Negative" },
      ],
    });
    const spy = spyOn(Math, "random").mockReturnValue(0);
    try {
      choices.reshuffle();
      const first = choices.displayChildren[0];
      expect(first._resultValue).toBe(first.alias ?? first._value);
      expect(["pos", "Neutral", "Negative"]).toContain(first._resultValue);
    } finally {
      spy.mockRestore();
    }
  });

  it("displayChildren falls back to tiedChildren when shuffled snapshot is stale (length mismatch)", () => {
    const choices = makeChoices({ randomize: true });
    choices.reshuffle();
    expect(choices._shuffledChildren.length).toBe(3);

    // Simulate dynamic-children load adding a new entry between reshuffles.
    unprotect(choices);
    choices.children.push({ type: "choice", value: "D", _value: "D" });
    expect(choices.tiedChildren.length).toBe(4);
    expect(choices._shuffledChildren.length).toBe(3);
    expect(choices.displayChildren.length).toBe(4);
    expect(choices.displayChildren.map((c) => c._value)).toEqual(["A", "B", "C", "D"]);

    choices.reshuffle();
    expect(choices._shuffledChildren.length).toBe(4);
    expect(new Set(choices.displayChildren.map((c) => c._value))).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("displayChildren contains only TOP-LEVEL choices (nested choices stay nested under their parent)", () => {
    // With `allowNested`, `tiedChildren` is recursive and would include grand-
    // children, which previously caused nested choices to be flattened (and
    // duplicated) into the shuffle pool. `displayChildren` must stay direct.
    const choices = ChoicesModel.create({
      name: "ch",
      toname: "t",
      choice: "multiple",
      allownested: true,
      randomize: true,
      children: [
        {
          type: "choice",
          value: "P1",
          _value: "P1",
          children: [{ type: "choice", value: "C1", _value: "C1" }],
        },
        {
          type: "choice",
          value: "P2",
          _value: "P2",
          children: [{ type: "choice", value: "C2", _value: "C2" }],
        },
      ],
    });

    expect(choices.tiedChildren.map((c) => c._value).sort()).toEqual(["C1", "C2", "P1", "P2"]);
    expect(choices.displayChildren.length).toBe(2);
    expect(choices.displayChildren.map((c) => c._value).sort()).toEqual(["P1", "P2"]);
    expect(choices.displayChildren.every((c) => c._value === "P1" || c._value === "P2")).toBe(true);
  });
});

describe("HtxChoice view", () => {
  function createMockStore(overrides = {}) {
    return {
      settings: {
        enableTooltips: true,
        enableLabelTooltips: true,
        enableHotkeys: true,
        ...overrides.settings,
      },
      ...overrides,
    };
  }

  /** Mock item to avoid annotation.results access (Choices not in full store tree). */
  function createMockItem(overrides = {}) {
    return {
      _value: "Option A",
      sel: false,
      isLeaf: true,
      indeterminate: false,
      isCheckbox: true,
      isReadOnly: () => false,
      visible: true,
      style: null,
      hint: null,
      hotkey: null,
      html: null,
      parent: { layout: "vertical" },
      nestedResults: false,
      children: [],
      toggleSelected: mock(),
      annotation: null,
      ...overrides,
    };
  }

  it("renders choice value and checkbox", () => {
    const item = createMockItem({ _value: "Option A" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    expect(screen.getByText("Option A")).toBeInTheDocument();
    const input = screen.getByRole("checkbox", { name: /option a/i });
    expect(input).toBeInTheDocument();
    expect(input).not.toBeChecked();
  });

  it("calls toggleSelected when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const toggleSelected = mock();
    const item = createMockItem({ _value: "Click me", toggleSelected });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const input = screen.getByRole("checkbox", { name: /click me/i });
    await user.click(input);
    expect(toggleSelected).toHaveBeenCalled();
  });

  it("renders hotkey when settings enable it", () => {
    const item = createMockItem({ _value: "V", hotkey: "1" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    expect(screen.getByText("[1]")).toBeInTheDocument();
  });

  it("does not render hotkey when enableHotkeys is false", () => {
    const item = createMockItem({ _value: "V", hotkey: "2" });
    const store = createMockStore({ settings: { enableHotkeys: false } });
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    expect(screen.queryByText("[2]")).not.toBeInTheDocument();
  });

  it("disables input when readonly", () => {
    const item = createMockItem({ _value: "R", isReadOnly: () => true });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const input = screen.getByRole("checkbox", { name: /r/i });
    expect(input).toBeDisabled();
  });

  it("does not call toggleSelected when readonly and clicked", async () => {
    const user = userEvent.setup();
    const toggleSelected = mock();
    const item = createMockItem({ _value: "R", isReadOnly: () => true, toggleSelected });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const input = screen.getByRole("checkbox", { name: /r/i });
    await user.click(input);
    expect(toggleSelected).not.toHaveBeenCalled();
  });

  it("renders collapse toggle for non-leaf choice", () => {
    const item = createMockItem({
      _value: "Parent",
      isLeaf: false,
      children: [{ _value: "Child" }],
      nestedResults: true,
    });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    expect(screen.getByText("Parent")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "" });
    expect(toggle).toBeInTheDocument();
  });

  it("toggles collapsed state when toggle button clicked", async () => {
    const user = userEvent.setup();
    const item = createMockItem({
      _value: "P",
      isLeaf: false,
      nestedResults: true,
      children: [{ _value: "C" }],
    });
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const toggle = screen.getByRole("button", { name: "" });
    await user.click(toggle);
    const childrenEl = container.querySelector('[class*="choice__children"]');
    expect(childrenEl).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toBeInTheDocument();
  });

  it("renders with custom style", () => {
    const item = createMockItem({ _value: "S", style: "color: red" });
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const itemDiv = container.querySelector('[class*="choice__item"]');
    expect(itemDiv?.style.color).toBe("red");
  });

  it("renders html when item.html is set", () => {
    const item = createMockItem({ _value: "V", html: "<b>Bold</b>" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const bold = document.querySelector("b");
    expect(bold).toBeInTheDocument();
    expect(bold).toHaveTextContent("Bold");
  });

  it("renders as radio when isCheckbox is false (single-radio)", () => {
    const item = createMockItem({ _value: "R", isCheckbox: false });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const radio = screen.getByRole("radio", { name: /r/i });
    expect(radio).toBeInTheDocument();
  });

  it("applies hidden class when visible is false", () => {
    const item = createMockItem({ _value: "H", visible: false });
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <HtxChoice item={item} />
      </Provider>,
    );
    const root = container.firstChild;
    expect(root).toHaveClass("ls-choice_hidden");
  });
});
