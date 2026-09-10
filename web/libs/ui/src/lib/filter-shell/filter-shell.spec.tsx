import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "../select/select";
import { FilterShell } from "./filter-shell";
import styles from "./filter-shell.module.css";

// cmdk / Radix need these in bun's DOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = mock();

const FILTER_SHELL_DIR = path.join(import.meta.dir);

describe("FilterShell", () => {
  it("exposes a named Filters region without a visible Filters: label", () => {
    render(<FilterShell filters={[]} />);
    expect(screen.getByRole("region", { name: "Filters" })).toBeInTheDocument();
    expect(screen.queryByText("Filters:")).not.toBeInTheDocument();
  });

  it("places Add Filter at the start of the filter row before pills", () => {
    render(
      <FilterShell
        filters={[
          {
            id: "role",
            label: "Role",
            pinned: true,
            controlId: "filter-shell-role-control",
            valueLabel: "Owner",
            control: (
              <button type="button" id="filter-shell-role-control">
                Owner
              </button>
            ),
          },
        ]}
        addFilter={{
          options: [{ id: "skills", label: "Skills", group: "Member" }],
          onSelect: mock(),
        }}
      />,
    );

    const region = screen.getByRole("region", { name: "Filters" });
    const addFilter = screen.getByTestId("filter-shell-add-filter");
    const pill = screen.getByTestId("filter-shell-pill-role");
    const children = [...region.querySelectorAll("[data-testid]")];

    expect(children.indexOf(addFilter)).toBeLessThan(children.indexOf(pill));
    expect(addFilter).toHaveTextContent("Add Filter");
  });

  it("renders pinned filters without a remove control", () => {
    render(
      <FilterShell
        filters={[
          {
            id: "role",
            label: "Role",
            pinned: true,
            controlId: "filter-shell-role-control",
            valueLabel: "Owner +4",
            control: (
              <button type="button" id="filter-shell-role-control">
                Owner +4
              </button>
            ),
          },
        ]}
      />,
    );

    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Owner +4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Role filter" })).not.toBeInTheDocument();
  });

  it("calls onRemove for unpinned filters and does not activate the value control", () => {
    const onRemove = mock();
    const onOpen = mock();

    render(
      <FilterShell
        filters={[
          {
            id: "skills",
            label: "Skills",
            controlId: "filter-shell-skills-control",
            valueLabel: "Human Res... +4",
            onRemove,
            control: (
              <button type="button" id="filter-shell-skills-control" onClick={onOpen}>
                Human Res... +4
              </button>
            ),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Skills filter" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("shows a Remove filter tooltip when the remove control is hovered", async () => {
    render(
      <FilterShell
        filters={[
          {
            id: "skills",
            label: "Skills",
            controlId: "filter-shell-skills-control",
            valueLabel: "Human Res... +4",
            onRemove: mock(),
            control: (
              <button type="button" id="filter-shell-skills-control">
                Human Res... +4
              </button>
            ),
          },
        ]}
      />,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Remove Skills filter" }));

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-body")).toHaveTextContent("Remove filter");
    });
  });

  it("paints a circular hover disc behind the remove glyph, negative on set pills", () => {
    const css = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-pill.module.css"), "utf8");
    expect(css).toMatch(/\.remove\s*\{[\s\S]*?border-radius:\s*50%/);
    expect(css).toMatch(/&:hover\s*\{[\s\S]*?background:\s*var\(--filter-pill-remove-hover-background\)/);
    expect(css).toMatch(
      /\.pill\[data-active="true"\]\s\.remove\s*\{[\s\S]*?--filter-pill-remove-hover-background:\s*var\(--color-negative-emphasis\)/,
    );
  });

  it("activates the value control when the filter name is clicked", () => {
    const onOpen = mock();

    render(
      <FilterShell
        filters={[
          {
            id: "role",
            label: "Role",
            pinned: true,
            controlId: "filter-shell-role-control",
            valueLabel: "Owner",
            control: (
              <button type="button" id="filter-shell-role-control" onClick={onOpen}>
                Owner
              </button>
            ),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Role"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("activates a wrapped value control when the filter name is clicked (TagMultiSelect shape)", () => {
    const onOpen = mock();

    render(
      <FilterShell
        filters={[
          {
            id: "tags",
            label: "Tags",
            pinned: true,
            controlId: "filter-shell-tags-control",
            valueLabel: "Any",
            control: (
              <div>
                <button type="button" id="filter-shell-tags-control" onClick={onOpen}>
                  Any
                </button>
              </div>
            ),
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Tags"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens the value control when Enter or Space is pressed on the name label", () => {
    const onOpen = mock();

    render(
      <FilterShell
        filters={[
          {
            id: "status",
            label: "Status",
            pinned: true,
            controlId: "filter-shell-status-control",
            valueLabel: "Open",
            control: (
              <button type="button" id="filter-shell-status-control" aria-label="Status filter" onClick={onOpen}>
                Open
              </button>
            ),
          },
        ]}
      />,
    );

    const nameLabel = screen.getByText("Status");
    nameLabel.focus();
    fireEvent.keyDown(nameLabel, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(nameLabel, { key: " " });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("tabs from the remove button to the value control", async () => {
    const user = userEvent.setup();

    render(
      <FilterShell
        filters={[
          {
            id: "created",
            label: "Created",
            controlId: "filter-shell-created-control",
            valueLabel: "Last 7 days",
            onRemove: mock(),
            control: (
              <button type="button" id="filter-shell-created-control" aria-label="Created filter">
                Last 7 days
              </button>
            ),
          },
        ]}
      />,
    );

    const remove = screen.getByRole("button", { name: "Remove Created filter" });
    const value = screen.getByRole("button", { name: "Created filter" });

    remove.focus();
    expect(remove).toHaveFocus();

    await user.tab();
    expect(value).toHaveFocus();
  });

  it("opens a Select listbox when the filter name label is clicked", async () => {
    render(
      <FilterShell
        filters={[
          {
            id: "role",
            label: "Role",
            pinned: true,
            active: true,
            controlId: "filter-shell-role-control",
            valueLabel: "Owner +1",
            control: (
              <Select
                options={["Owner", "Annotator"] as any}
                renderSelected={() => "Owner +1"}
                triggerClassName={styles.filterShellValueTrigger}
                triggerProps={{ id: "filter-shell-role-control", "aria-label": "Role filter" }}
                isInline
              />
            ),
          },
        ]}
      />,
    );

    const trigger = document.getElementById("filter-shell-role-control");
    expect(trigger).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByText("Role"));

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("select-popup")).toBeInTheDocument();
      expect(screen.getByText("Annotator")).toBeInTheDocument();
    });
  });

  it("marks the pill data-active only when the filter is set, not when the value control opens", async () => {
    render(
      <FilterShell
        filters={[
          {
            id: "tags",
            label: "Tags",
            pinned: true,
            controlId: "filter-shell-tags-control",
            valueLabel: "Any",
            control: (
              <Select
                options={["Quality", "Priority"] as any}
                renderSelected={() => "Any"}
                triggerClassName={styles.filterShellValueTrigger}
                triggerProps={{ id: "filter-shell-tags-control", "aria-label": "Tags filter" }}
                isInline
              />
            ),
          },
          {
            id: "role",
            label: "Role",
            pinned: true,
            active: true,
            controlId: "filter-shell-role-control",
            valueLabel: "Owner",
            control: (
              <button type="button" id="filter-shell-role-control" aria-label="Role filter">
                Owner
              </button>
            ),
          },
        ]}
      />,
    );

    const unsetPill = screen.getByTestId("filter-shell-pill-tags");
    const setPill = screen.getByTestId("filter-shell-pill-role");
    expect(unsetPill).not.toHaveAttribute("data-active");
    expect(setPill).toHaveAttribute("data-active", "true");

    const trigger = document.getElementById("filter-shell-tags-control");
    fireEvent.click(screen.getByText("Tags"));

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    expect(unsetPill).not.toHaveAttribute("data-active");
    expect(setPill).toHaveAttribute("data-active", "true");
  });

  it("does not paint the name half primary from aria-expanded alone", () => {
    const css = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-pill.module.css"), "utf8");
    const primaryNameRule = css.match(/\.pill\[data-active="true"\]\s+\.name\s*\{[\s\S]*?\}/);
    expect(primaryNameRule?.[0]).toContain("--color-primary-background");

    const openRules = css.match(/\.pill[^{]*\[aria-expanded="true"\][^{]*\{[\s\S]*?\}/g) ?? [];
    const openNameRules = openRules.filter((rule) => rule.includes("--filter-pill-name-border-color"));
    expect(openNameRules.length).toBeGreaterThan(0);
    for (const rule of openNameRules) {
      expect(rule).not.toMatch(/--color-primary-background/);
    }
  });

  it("drives both pill halves from shared --filter-pill-* chrome variables", () => {
    const pillCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-pill.module.css"), "utf8");
    const shellCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-shell.module.css"), "utf8");

    expect(pillCss).toMatch(/\.pill\s*\{[\s\S]*?--filter-pill-name-border-color/);
    expect(pillCss).toMatch(/\.pill\s*\{[\s\S]*?--filter-pill-value-border-color/);
    expect(pillCss).toMatch(/\.name[\s\S]*?border:[\s\S]*?var\(--filter-pill-name-border-color\)/);
    expect(pillCss).toMatch(
      /\.control[\s\S]*?>\s*:global\(button\)[\s\S]*?border:[\s\S]*?var\(--filter-pill-value-border-color\)/,
    );
    expect(pillCss).toMatch(/\.pill:hover \.control > :global\(button\)[\s\S]*?border-left-width:\s*0/);
    expect(shellCss).toMatch(/\.filterShellValueTrigger[\s\S]*?border:[\s\S]*?var\(--filter-pill-value-border-color/);
    expect(shellCss).toMatch(
      /\.filterShellTreeValueTrigger[\s\S]*?--multi-tree-trigger-border:[\s\S]*?var\(--filter-pill-value-border-color/,
    );
  });

  it("uses content for set value text and subtler for unset via data-active", () => {
    const pillCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-pill.module.css"), "utf8");
    const shellCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-shell.module.css"), "utf8");

    expect(shellCss).toMatch(/\.filterShellValueTrigger[\s\S]*?color:\s*var\(--color-neutral-content-subtler\)/);
    expect(shellCss).toMatch(
      /\.filterShellTreeValueTrigger[\s\S]*?--multi-tree-trigger-color:\s*var\(--color-neutral-content-subtler\)/,
    );
    expect(pillCss).toMatch(
      /\.pill\[data-active="true"\] \.control > :global\(button\)[\s\S]*?color:\s*var\(--color-neutral-content\)/,
    );
    expect(pillCss).toMatch(
      /\.pill\[data-active="true"\][\s\S]*?\.control[\s\S]*?lsf-multi-tree-select__input[\s\S]*?--multi-tree-trigger-color:\s*var\(--color-neutral-content\)/,
    );
    expect(pillCss).toMatch(
      /\.control[\s\S]*?>\s*:global\(button\)[\s\S]*?color:\s*var\(--color-neutral-content-subtler\)/,
    );
  });

  it("styles overflow +N smaller than the primary value label", () => {
    const css = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-shell.module.css"), "utf8");
    expect(css).toMatch(/\.valueOverflowCount[\s\S]*?font-size:\s*var\(--font-size-label-smaller\)/);
    expect(css).toMatch(/\.valuePrimary[\s\S]*?font-size:\s*var\(--font-size-body-small\)/);
  });

  it("sizes every control in the filter row from one --filter-pill-height declaration", () => {
    const pillCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-pill.module.css"), "utf8");
    const shellCss = fs.readFileSync(path.join(FILTER_SHELL_DIR, "filter-shell.module.css"), "utf8");

    expect(shellCss).toMatch(/\.shell\s*\{[\s\S]*?--filter-pill-height:\s*30px/);
    // The row height is a single source of truth: no control may hardcode it again.
    expect(`${shellCss}\n${pillCss}`.match(/30px/g)).toHaveLength(1);

    expect(pillCss).toMatch(/\.pill\s*\{[\s\S]*?height:\s*var\(--filter-pill-height\)/);
    expect(pillCss).toMatch(/>\s*:global\(button\)[\s\S]*?height:\s*var\(--filter-pill-height\)/);
    expect(shellCss).toMatch(/\.addFilterTrigger\s*\{[\s\S]*?height:\s*var\(--filter-pill-height\)/);
    expect(shellCss).toMatch(/\.filterShellValueTrigger\s*\{[\s\S]*?height:\s*var\(--filter-pill-height\)/);
    expect(shellCss).toMatch(/\.filters\s\.resetButton\s*\{[\s\S]*?height:\s*var\(--filter-pill-height\)/);
  });

  it("applies the pill-height class to Reset instead of an inline height override", () => {
    render(<FilterShell filters={[]} onReset={mock()} />);

    expect(screen.getByTestId("filter-shell-reset")).toHaveClass(styles.resetButton);
  });

  it("renders domain-agnostic filter ids without Members coupling", () => {
    render(
      <FilterShell
        filters={[
          {
            id: "status",
            label: "Status",
            pinned: true,
            controlId: "filter-shell-status-control",
            valueLabel: "Open",
            control: (
              <button type="button" id="filter-shell-status-control" aria-label="Status filter">
                Open
              </button>
            ),
          },
          {
            id: "created",
            label: "Created",
            controlId: "filter-shell-created-control",
            valueLabel: "Last 7 days",
            onRemove: mock(),
            control: (
              <button type="button" id="filter-shell-created-control" aria-label="Created filter">
                Last 7 days
              </button>
            ),
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByTestId("filter-shell-pill-status")).toBeInTheDocument();
    expect(screen.getByTestId("filter-shell-pill-created")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Created filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Created filter" })).toBeInTheDocument();
  });

  it("does not import Members, organization, or project domain modules", () => {
    const forbidden = /\b(Members|organization|project|Organization|Project)\b/;
    const sourceFiles = fs
      .readdirSync(FILTER_SHELL_DIR)
      .filter((name) => /\.(tsx?|jsx?)$/.test(name) && !/\.spec\./.test(name) && !/\.stories\./.test(name));

    expect(sourceFiles.length).toBeGreaterThan(0);

    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(FILTER_SHELL_DIR, file), "utf8");
      const importLines = source.split("\n").filter((line) => /^\s*import\s/.test(line));
      for (const line of importLines) {
        expect(line).not.toMatch(forbidden);
      }
    }
  });

  it("disables Add Filter when there are no remaining options", () => {
    render(
      <FilterShell
        filters={[]}
        addFilter={{
          options: [],
          onSelect: mock(),
          disabled: true,
        }}
      />,
    );

    expect(screen.getByTestId("filter-shell-add-filter")).toBeDisabled();
  });

  it("calls onReset", () => {
    const onReset = mock();

    render(<FilterShell filters={[]} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
