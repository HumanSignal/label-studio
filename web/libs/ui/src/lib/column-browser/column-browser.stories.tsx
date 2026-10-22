import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DotsThreeVerticalIcon, PlusIcon } from "@humansignal/icons";
import { ColumnBrowser, ColumnBrowserColumn, ColumnBrowserItem } from "./column-browser";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";

const meta: Meta<typeof ColumnBrowser> = {
  component: ColumnBrowser,
  title: "UI/ColumnBrowser",
  parameters: {
    docs: {
      description: {
        component:
          "Side-by-side columns for drilling into a hierarchy, one column per level, in the style of a file browser. " +
          "The browser is controlled: the caller keeps the open path and renders one `ColumnBrowserColumn` per level " +
          "with `ColumnBrowserItem` rows. Items reveal their `actions` on hover, focus or selection, and show a count " +
          "with a caret when `childCount` is set. The whole browser shares one border; columns are divided by a line.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColumnBrowser>;

interface Node {
  id: number;
  label: string;
  parent: number | null;
  inactive?: boolean;
}

const NODES: Node[] = [
  { id: 1, label: "Languages", parent: null },
  { id: 2, label: "Domain skills", parent: null },
  { id: 3, label: "Tools", parent: null, inactive: true },
  { id: 11, label: "English", parent: 1 },
  { id: 12, label: "Spanish", parent: 1 },
  { id: 13, label: "Portuguese", parent: 1 },
  { id: 111, label: "English (US)", parent: 11 },
  { id: 112, label: "English (UK)", parent: 11 },
  { id: 113, label: "English (Australia)", parent: 11, inactive: true },
  { id: 21, label: "Healthcare", parent: 2 },
  { id: 22, label: "Finance", parent: 2 },
  { id: 211, label: "Radiology", parent: 21 },
];

const childrenOf = (parent: number | null) => NODES.filter((node) => node.parent === parent);

/** Drill-down browser driven by a path of selected ids, one column per level. */
function Browser({ withActions = false, withFooter = false }: { withActions?: boolean; withFooter?: boolean }) {
  const [path, setPath] = useState<number[]>([1, 11]);
  const parents: (Node | null)[] = [null, ...path.map((id) => NODES.find((node) => node.id === id) as Node)];
  const columns = parents
    .map((parent) => ({ parent, items: childrenOf(parent?.id ?? null) }))
    .filter((column) => column.items.length > 0);

  const actions = (node: Node) => (
    <Button
      variant="neutral"
      look="string"
      size="small"
      leading={<DotsThreeVerticalIcon weight="bold" />}
      aria-label={`Actions for ${node.label}`}
      onClick={(event) => event.stopPropagation()}
    />
  );

  return (
    <ColumnBrowser aria-label="Catalog items">
      {columns.map((column, level) => (
        <ColumnBrowserColumn
          key={column.parent?.id ?? "root"}
          title={column.parent?.label ?? "Catalog"}
          count={column.items.length}
          footer={
            withFooter && (
              <Button variant="neutral" look="string" size="small" leading={<PlusIcon size={16} weight="bold" />}>
                Add item
              </Button>
            )
          }
        >
          {column.items.map((node) => (
            <ColumnBrowserItem
              key={node.id}
              selected={path[level] === node.id}
              onSelect={() => setPath([...path.slice(0, level), node.id])}
              childCount={childrenOf(node.id).length}
              trailing={
                node.inactive && (
                  <Badge variant="neutral" look="outline" size="small">
                    Inactive
                  </Badge>
                )
              }
              actions={withActions ? actions(node) : undefined}
            >
              {node.label}
            </ColumnBrowserItem>
          ))}
        </ColumnBrowserColumn>
      ))}
    </ColumnBrowser>
  );
}

/**
 * Click an item to open its children in the next column. An item without children opens nothing.
 */
export const Default: Story = {
  render: () => <Browser />,
};

/**
 * Each item carries a compact actions control, revealed on hover, focus or selection, and each column
 * ends with a right-aligned footer for a column-level action.
 */
export const WithActionsAndFooter: Story = {
  render: () => <Browser withActions withFooter />,
};

/**
 * A single column with a footer, for a flat list that may grow into a hierarchy later.
 */
export const SingleColumn: Story = {
  render: () => (
    <ColumnBrowser aria-label="Items">
      <ColumnBrowserColumn
        title="Catalog"
        count={3}
        footer={
          <Button variant="neutral" look="string" size="small" leading={<PlusIcon size={16} weight="bold" />}>
            Add item
          </Button>
        }
      >
        <ColumnBrowserItem>Alpha</ColumnBrowserItem>
        <ColumnBrowserItem selected>Beta</ColumnBrowserItem>
        <ColumnBrowserItem>Gamma</ColumnBrowserItem>
      </ColumnBrowserColumn>
    </ColumnBrowser>
  ),
};

/**
 * Columns are a fixed minimum width and the browser scrolls horizontally once the path gets deep.
 */
export const DeepPath: Story = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <ColumnBrowser aria-label="Deep path">
        {["Catalog", "Languages", "English", "Regional", "Accents"].map((title, level) => (
          <ColumnBrowserColumn key={title} title={title} count={2}>
            <ColumnBrowserItem selected={level < 4} childCount={level < 4 ? 2 : undefined}>
              {`Level ${level + 1} item`}
            </ColumnBrowserItem>
            <ColumnBrowserItem>{`Another level ${level + 1} item`}</ColumnBrowserItem>
          </ColumnBrowserColumn>
        ))}
      </ColumnBrowser>
      <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
        Scroll sideways to reach the deeper columns.
      </Typography>
    </div>
  ),
};
