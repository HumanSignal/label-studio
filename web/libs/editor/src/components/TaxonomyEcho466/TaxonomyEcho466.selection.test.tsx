import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

import { TaxonomyEcho466 } from "./TaxonomyEcho466";

const pathSep = " / ";

const nestedItems = [
  {
    label: "Parent",
    path: ["Parent"],
    depth: 0,
    isLeaf: false,
    children: [
      { label: "LeafA", path: ["Parent", "LeafA"], depth: 1 },
      { label: "LeafB", path: ["Parent", "LeafB"], depth: 1 },
    ],
  },
];

const europeAndorraItems = [
  {
    label: "Europe",
    path: ["Europe"],
    depth: 0,
    isLeaf: false,
    children: [{ label: "Andorra", path: ["Europe", "Andorra"], depth: 1 }],
  },
];

const defaultOptions = {
  leafsOnly: true,
  pathSeparator: pathSep,
  showFullPath: false,
};

function pathToSelected(paths: string[][]) {
  return paths.map((segments) => segments.map((value) => ({ value, label: value })));
}

async function openTaxonomyAndExpandFirstBranch() {
  fireEvent.click(screen.getByTestId("taxonomy-trigger"));
  const expandButtons = await within(document.body).findAllByRole("button", { name: "Expand" });
  fireEvent.click(expandButtons[0]!);
}

type HarnessProps = {
  items?: typeof nestedItems;
  initialSelected?: ReturnType<typeof pathToSelected>;
  maxUsages?: number | string;
};

function TaxonomyEcho466Harness({ items = nestedItems, initialSelected = [], maxUsages }: HarnessProps) {
  const [selected, setSelected] = useState(initialSelected);
  return (
    <TaxonomyEcho466
      items={items}
      selected={selected}
      onChange={(_n, paths: string[][]) =>
        setSelected(paths.map((segments) => segments.map((value) => ({ value, label: value }))))
      }
      options={{ ...defaultOptions, ...(maxUsages !== undefined ? { maxUsages } : {}) }}
      isEditable
    />
  );
}

/** Stateful tree: Europe → Andorra; `maxUsages="1"` matches MobX tag (string). */
function EuropeAndorraMaxOneHarness() {
  const [selected, setSelected] = useState<ReturnType<typeof pathToSelected>>([]);
  return (
    <TaxonomyEcho466
      items={europeAndorraItems}
      selected={selected}
      onChange={(_n, paths: string[][]) =>
        setSelected(paths.map((segments) => segments.map((value) => ({ value, label: value }))))
      }
      options={{ leafsOnly: false, pathSeparator: pathSep, showFullPath: false, maxUsages: "1" }}
      isEditable
    />
  );
}

describe("TaxonomyEcho466 selection (leafsOnly legacy parity)", () => {
  it("disables the parent row checkbox when leafsOnly; leaves stay enabled", async () => {
    render(
      <TaxonomyEcho466 items={nestedItems} selected={[]} onChange={() => {}} options={defaultOptions} isEditable />,
    );
    await openTaxonomyAndExpandFirstBranch();
    const checkboxes = within(document.body).getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0]).toBeDisabled();
    expect(checkboxes[1]).not.toBeDisabled();
    expect(checkboxes[2]).not.toBeDisabled();
  });

  it("toggles only the clicked leaf path (no subtree select-all)", async () => {
    render(<TaxonomyEcho466Harness />);
    await openTaxonomyAndExpandFirstBranch();
    const trigger = screen.getByTestId("taxonomy-trigger");
    const checkboxes = within(document.body).getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]!);
    expect(within(trigger).getByText("LeafA")).toBeInTheDocument();
    fireEvent.click(checkboxes[2]!);
    expect(within(trigger).getByText("LeafB")).toBeInTheDocument();
    expect(within(trigger).getByText("LeafA")).toBeInTheDocument();
  });

  it("disables extra leaf checkboxes when maxUsages is reached", async () => {
    render(<TaxonomyEcho466Harness initialSelected={pathToSelected([["Parent", "LeafA"]])} maxUsages="1" />);
    await openTaxonomyAndExpandFirstBranch();
    const checkboxes = within(document.body).getAllByRole("checkbox");
    expect(checkboxes[2]).toBeDisabled();
  });

  it("wraps hinted labels so Tooltip receives a single element (no Children.only throw)", () => {
    const itemsWithHint = [
      {
        label: "Root",
        path: ["Root"],
        depth: 0,
        hint: "hint text",
        children: [{ label: "Leaf", path: ["Root", "Leaf"], depth: 1 }],
      },
    ];
    const err = mock((_msg?: string, ..._args: unknown[]) => {});
    const realError = console.error;
    console.error = err;
    try {
      render(
        <TaxonomyEcho466 items={itemsWithHint} selected={[]} onChange={() => {}} options={defaultOptions} isEditable />,
      );
      fireEvent.click(screen.getByTestId("taxonomy-trigger"));
      expect(within(document.body).getByRole("button", { name: "Root" })).toBeInTheDocument();
      expect(err).not.toHaveBeenCalled();
    } finally {
      console.error = realError;
    }
  });

  it("expands a non-leaf row via label click when leafsOnly (expandLabelTogglesExpand)", async () => {
    render(
      <TaxonomyEcho466 items={nestedItems} selected={[]} onChange={() => {}} options={defaultOptions} isEditable />,
    );
    await openTaxonomyAndExpandFirstBranch();
    expect(within(document.body).getByRole("checkbox", { name: /LeafA/i })).toBeInTheDocument();
  });
});

/**
 * Fails on unfixed TaxonomyEcho466: with only a child selected, the parent is indeterminate.
 * `disableCheckbox` used `checkState === "unchecked"`, so the parent stayed enabled; clicking it
 * added a second path (e.g. Europe + Andorra) despite `maxUsages="1"`.
 * `handleToggleSelect` also used `typeof maxUsages === "number"` while the tag passes a string,
 * so `atMax` never blocked (defense in depth once the parent is clickable).
 *
 * Note: two sibling leaves under the same parent both stay `unchecked` at the limit, so both
 * get disabled by the old `unchecked` rule — a "second leaf" test there does not reproduce the bug.
 */
describe("TaxonomyEcho466 maxUsages regression (string limit + indeterminate parent)", () => {
  it("does not add a parent path when maxUsages is the XML string and a child is already selected", async () => {
    render(<EuropeAndorraMaxOneHarness />);
    fireEvent.click(screen.getByTestId("taxonomy-trigger"));
    const expandButtons = await within(document.body).findAllByRole("button", { name: "Expand" });
    fireEvent.click(expandButtons[0]!);
    const checkboxes = within(document.body).getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]!);
    const trigger = screen.getByTestId("taxonomy-trigger");
    expect(within(trigger).getByText("Andorra")).toBeInTheDocument();
    fireEvent.click(checkboxes[0]!);
    expect(within(trigger).queryByText("Europe")).not.toBeInTheDocument();
  });

  it("disables indeterminate parent when a descendant is the only selection at the limit", async () => {
    render(
      <TaxonomyEcho466
        items={europeAndorraItems}
        selected={pathToSelected([["Europe", "Andorra"]])}
        onChange={() => {}}
        options={{ leafsOnly: false, pathSeparator: pathSep, showFullPath: false, maxUsages: "1" }}
        isEditable
      />,
    );
    fireEvent.click(screen.getByTestId("taxonomy-trigger"));
    const expandButtons = await within(document.body).findAllByRole("button", { name: "Expand" });
    fireEvent.click(expandButtons[0]!);
    expect(within(document.body).getByRole("checkbox", { name: /Europe/i })).toBeDisabled();
  });
});
