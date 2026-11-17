import {
  CheckCircleIcon,
  CheckIcon,
  CircleDashedIcon,
  ClockIcon,
  DotsThreeVerticalIcon,
  FileDottedIcon,
  FlagIcon,
  GearIcon,
} from "@humansignal/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Avatar } from "../avatar";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Dropdown } from "../dropdown";
import { Timeline } from "./timeline";

const meta: Meta<typeof Timeline> = {
  title: "UI/Timeline",
  component: Timeline,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A presentational, chronological list with a marker, a title, optional metadata and optional expandable children. Consumers own selection, expansion and pagination.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Timeline>;

const ICON_SIZE = 20;

function Dot() {
  return <span className="size-[3px] shrink-0 rounded-full bg-neutral-content-subtler" aria-hidden="true" />;
}

/** Overflow trigger in the library's outlined neutral style, for the slot that slides in on hover or focus. */
function RowKebab({ label }: { label: string }) {
  return (
    <Button
      type="button"
      look="outlined"
      variant="neutral"
      size="smaller"
      icon={<DotsThreeVerticalIcon size={16} weight="bold" />}
      aria-label={label}
    />
  );
}

/** Three plain entries: title, description and a meta row, no selection or expansion. */
export const Default: Story = {
  render: () => (
    <div className="w-[360px]">
      <Timeline>
        <Timeline.Item
          icon={<FlagIcon size={ICON_SIZE} />}
          title="Milestone reached"
          meta={
            <>
              <span>Ada Author</span>
              <Dot />
              <span>Nov 6, 10:32 AM</span>
            </>
          }
        />
        <Timeline.Item
          icon={<ClockIcon size={ICON_SIZE} />}
          emphasis="subtle"
          title="Review requested"
          description="3 items changed"
          meta={
            <>
              <span>Ben Editor</span>
              <Dot />
              <span>Nov 5, 4:02 PM</span>
            </>
          }
        />
        <Timeline.Item
          icon={<GearIcon size={ICON_SIZE} />}
          emphasis="subtle"
          title="Created"
          meta={<span>Automation</span>}
        />
      </Timeline>
    </div>
  ),
};

/** Title-only entries are centred against the 32px marker; entries with a second row stay top-aligned. */
export const SingleAndTwoLine: Story = {
  render: () => (
    <div className="w-[360px]">
      <Timeline>
        <Timeline.Item
          icon={<CheckIcon size={ICON_SIZE} />}
          title="Selected single-line entry"
          selected
          onSelect={() => {}}
          data-testid="story-single-selected"
        />
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} title="Single-line entry" data-testid="story-single" />
        <Timeline.Item
          icon={<CheckIcon size={ICON_SIZE} />}
          title="Entry with a description"
          description="Ada Author · 9 changes"
          data-testid="story-two-line"
        />
        <Timeline.Item
          icon={<CheckIcon size={ICON_SIZE} />}
          title="Entry with a meta row"
          meta={<span>Nov 4, 9:00 AM · Ben Editor</span>}
          data-testid="story-two-line-meta"
        />
      </Timeline>
    </div>
  ),
};

/** An expandable item whose marker is the toggle, with selectable rows inside; the connector runs through them. */
export const ExpandableWithSelectableRows: Story = {
  render: () => {
    function ExpandableStory() {
      const [expanded, setExpanded] = useState(true);
      const [selected, setSelected] = useState("row-2");
      const rows = [
        { id: "row-1", label: "Introduction · 3 edits" },
        { id: "row-2", label: "Chapter 1 · 5 edits" },
        { id: "row-3", label: "Chapter 2 · 1 edit" },
      ];
      return (
        <div className="w-[360px]">
          <Timeline>
            <Timeline.Item
              title="Nov 6, 10:14 AM – 10:32 AM"
              description="Ada Author · 9 changes"
              expandable
              expanded={expanded}
              onExpandedChange={setExpanded}
              expandLabel="details for Nov 6, 10:14 AM – 10:32 AM"
              data-testid="story-group"
            >
              {rows.map((row) => (
                <Timeline.Row key={row.id} selected={row.id === selected} onSelect={() => setSelected(row.id)}>
                  {row.label}
                </Timeline.Row>
              ))}
            </Timeline.Item>
            <Timeline.Item icon={<FlagIcon size={ICON_SIZE} />} emphasis="subtle" title="Created" />
          </Timeline>
        </div>
      );
    }
    return <ExpandableStory />;
  },
};

/** Selecting an entry tints its marker and heavies its title; the selection is also announced with `aria-current`. */
export const Selected: Story = {
  render: () => {
    function SelectedStory() {
      const [selected, setSelected] = useState<string | null>("b");
      const items = [
        { id: "a", title: "Latest entry" },
        { id: "b", title: "Nov 6, 10:14 AM" },
        { id: "c", title: "Nov 5, 4:02 PM" },
      ];
      return (
        <div className="w-[320px]">
          <Timeline>
            {items.map((item) => (
              <Timeline.Item
                key={item.id}
                icon={<FileDottedIcon size={ICON_SIZE} />}
                title={item.title}
                selected={item.id === selected}
                onSelect={() => setSelected(item.id)}
                data-testid={`story-row-${item.id}`}
              />
            ))}
          </Timeline>
        </div>
      );
    }
    return <SelectedStory />;
  },
};

/** Trailing actions stay hidden until hover or keyboard focus, and show on touch (coarse pointers). */
export const WithActions: Story = {
  render: () => (
    <div className="w-[360px]">
      <Timeline>
        <Timeline.Item
          icon={<ClockIcon size={ICON_SIZE} />}
          title="Nov 6, 10:14 AM – 10:32 AM"
          description="Ada Author · 9 changes"
          actions={
            <Dropdown.Trigger
              alignment="bottom-right"
              content={
                <div role="menu" className="flex w-max flex-col gap-tightest p-tight">
                  <Button type="button" role="menuitem" look="ghost" variant="neutral" size="small" align="left">
                    First action
                  </Button>
                  <Button type="button" role="menuitem" look="ghost" variant="neutral" size="small" align="left">
                    Second action
                  </Button>
                </div>
              }
            >
              <Button
                type="button"
                look="outlined"
                variant="neutral"
                size="smaller"
                icon={<DotsThreeVerticalIcon size={16} weight="bold" />}
                aria-label="Actions for Nov 6, 10:14 AM – 10:32 AM"
                aria-haspopup="menu"
                data-testid="story-actions-trigger"
              />
            </Dropdown.Trigger>
          }
        />
      </Timeline>
    </div>
  ),
};

/** Placeholders for a loading list: same markers, spacing and connector as real entries, so nothing jumps. */
export const Loading: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline aria-busy="true" aria-label="Loading entries">
        <Timeline.Skeleton />
        <Timeline.Skeleton />
        <Timeline.Skeleton />
        <Timeline.Skeleton withMeta={false} />
      </Timeline>
    </div>
  ),
};

/** `connector={false}`: a list that is not chronological keeps its markers and spacing but draws no line. */
export const WithoutConnector: Story = {
  render: () => {
    function Example() {
      const [selected, setSelected] = useState("b");
      return (
        <div className="w-[320px]">
          <Timeline connector={false}>
            {[
              ["a", "Alpha", "Added Nov 6"],
              ["b", "Beta", "Added Nov 4"],
              ["c", "Gamma", "Added Oct 28"],
            ].map(([id, title, description]) => (
              <Timeline.Item
                key={id}
                icon={<FlagIcon size={ICON_SIZE} />}
                title={title}
                description={description}
                selected={selected === id}
                onSelect={() => setSelected(id)}
                data-testid={`story-${id}`}
              />
            ))}
          </Timeline>
        </div>
      );
    }
    return <Example />;
  },
};

/** The five semantic tones available when a consumer does not supply its own colour mapping. */
export const Tones: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline>
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} tone="primary" title="Primary" />
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} tone="positive" title="Positive" />
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} tone="warning" title="Warning" />
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} tone="negative" title="Negative" />
        <Timeline.Item icon={<CheckIcon size={ICON_SIZE} />} tone="neutral" title="Neutral" />
      </Timeline>
    </div>
  ),
};

/** Idle: the action, ready to fetch. The consumer owns the fetch via `onLoadMore`, and the label and caption. */
export const LoadMoreIdle: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline>
        <Timeline.Item icon={<ClockIcon size={ICON_SIZE} />} title="Nov 6, 10:14 AM" />
        <Timeline.LoadMore hasMore label="Load earlier" onLoadMore={() => {}} caption="Showing 1 of 12 items" />
      </Timeline>
    </div>
  ),
};

/** The caption is optional: without it the entry is just the marker and the label, centred against each other. */
export const LoadMoreWithoutCaption: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline>
        <Timeline.Item icon={<ClockIcon size={ICON_SIZE} />} title="Nov 6, 10:14 AM" />
        <Timeline.LoadMore hasMore label="Load earlier…" onLoadMore={() => {}} />
      </Timeline>
    </div>
  ),
};

/** Loading: the action shows its waiting state while the next page is in flight. */
export const LoadMoreLoading: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline>
        <Timeline.Item icon={<ClockIcon size={ICON_SIZE} />} title="Nov 6, 10:14 AM" />
        <Timeline.LoadMore hasMore isLoadingMore onLoadMore={() => {}} caption="Showing 1 of 12 items" />
      </Timeline>
    </div>
  ),
};

/** Exhausted: `hasMore={false}` renders nothing — there is nothing left to load. */
export const LoadMoreExhausted: Story = {
  render: () => (
    <div className="w-[320px]">
      <Timeline>
        <Timeline.Item icon={<ClockIcon size={ICON_SIZE} />} title="Nov 6, 10:14 AM" />
        <Timeline.LoadMore hasMore={false} onLoadMore={() => {}} caption="Showing 12 of 12 items" />
      </Timeline>
    </div>
  ),
};

/**
 * Caller-supplied marker colours (`markerColor`), strong/subtle emphasis, a reason line and an automated actor.
 * A long author address truncates while the timestamp stays on one line.
 */
export const WithReasonAndAutomatedActor: Story = {
  render: () => (
    <div className="w-[360px]">
      <Timeline>
        <Timeline.Item
          icon={<CheckCircleIcon size={ICON_SIZE} weight="fill" />}
          markerColor={{ background: "var(--color-accent-kale-base)", icon: "var(--color-accent-kale-subtlest)" }}
          emphasis="strong"
          title="Completed"
          description="All checks passed"
          meta={
            <>
              <span className="flex min-w-0 items-center gap-tighter">
                <Avatar className="shrink-0" size="small" username="Ada Author" />
                <span className="min-w-0 truncate">Ada Author</span>
              </span>
              <Dot />
              <span className="shrink-0 whitespace-nowrap">Nov 6, 10:32 AM</span>
            </>
          }
        />
        <Timeline.Item
          icon={<GearIcon size={ICON_SIZE} />}
          markerColor={{ background: "var(--color-accent-grape-subtle)", icon: "var(--color-accent-grape-base)" }}
          emphasis="subtle"
          title="Running"
          description="A long author address truncates; the timestamp stays on one line"
          meta={
            <>
              <span className="flex min-w-0 items-center gap-tighter">
                <Avatar className="shrink-0" size="small" username="RC" />
                <span className="min-w-0 truncate">ricardo+workforce@humansignal.com</span>
              </span>
              <Dot />
              <span className="shrink-0 whitespace-nowrap">Oct 5, 2026, 02:35 PM</span>
            </>
          }
        />
        <Timeline.Item
          icon={<GearIcon size={ICON_SIZE} />}
          markerColor={{ background: "var(--color-accent-grape-subtle)", icon: "var(--color-accent-grape-base)" }}
          emphasis="subtle"
          title="Started"
          meta={
            <>
              <span className="shrink-0">Automation</span>
              <Dot />
              <span className="shrink-0 whitespace-nowrap">Nov 6, 9:02 AM</span>
            </>
          }
        />
        <Timeline.Item
          icon={<CircleDashedIcon size={ICON_SIZE} />}
          markerColor={{ background: "var(--color-accent-sand-subtle)", icon: "var(--color-accent-sand-bold)" }}
          emphasis="subtle"
          title="Queued"
          meta={
            <>
              <span className="shrink-0">Automation</span>
              <Dot />
              <span className="shrink-0 whitespace-nowrap">Nov 6, 9:00 AM</span>
            </>
          }
        />
      </Timeline>
    </div>
  ),
};

/** A badge beside the title, selectable and expandable entries, trailing actions and a load-more entry together. */
export const ExpandableWithBadgeAndLoadMore: Story = {
  render: () => {
    function CompositionStory() {
      const [selected, setSelected] = useState<string | null>("latest");
      const [expanded, setExpanded] = useState(false);
      return (
        <div className="w-[360px]">
          <Timeline>
            <Timeline.Item
              icon={<FileDottedIcon size={ICON_SIZE} />}
              title="Latest entry"
              titleBadge={
                <Badge size="small" variant="warning">
                  Pending
                </Badge>
              }
              description="Last updated Nov 6, 10:32 AM"
              selected={selected === "latest"}
              onSelect={() => setSelected("latest")}
              data-testid="story-latest"
            />
            <Timeline.Item
              title="Nov 6, 9:40 AM – 10:14 AM"
              description="Ada Author, Ben Editor · 9 changes"
              expandable
              expanded={expanded}
              onExpandedChange={setExpanded}
              expandLabel="details for Nov 6, 9:40 AM – 10:14 AM"
              onSelect={() => {
                setExpanded(true);
                setSelected("row-1");
              }}
              actions={
                <Button
                  type="button"
                  look="outlined"
                  variant="neutral"
                  size="smaller"
                  icon={<DotsThreeVerticalIcon size={16} weight="bold" />}
                  aria-label="Actions for Nov 6, 9:40 AM – 10:14 AM"
                />
              }
              data-testid="story-group"
            >
              <Timeline.Row
                selected={selected === "row-1"}
                onSelect={() => setSelected("row-1")}
                actions={<RowKebab label="Actions for Introduction" />}
              >
                Introduction · 3 edits
              </Timeline.Row>
              <Timeline.Row selected={selected === "row-2"} onSelect={() => setSelected("row-2")}>
                Chapter 1 · 6 edits
              </Timeline.Row>
            </Timeline.Item>
            <Timeline.Item
              icon={<CheckIcon size={ICON_SIZE} />}
              title="Approved entry"
              selected={selected === "approved"}
              onSelect={() => setSelected("approved")}
              meta={<span>Nov 4, 9:00 AM</span>}
              data-testid="story-approved"
            />
            <Timeline.LoadMore hasMore label="Load earlier" onLoadMore={() => {}} caption="Showing 1 of 8 items" />
          </Timeline>
        </div>
      );
    }
    return <CompositionStory />;
  },
};

/** Selecting an expandable item's header expands it and selects its topmost child; selecting a child directly
 * leaves the parent expanded and does not change the expansion. */
export const ExpandableSelectsFirstChild: Story = {
  render: () => {
    function SelectFirstChildStory() {
      const [expanded, setExpanded] = useState(false);
      const [selected, setSelected] = useState<string | null>(null);
      const children = [
        { id: "child-1", label: "Introduction" },
        { id: "child-2", label: "Chapter 1" },
      ];
      return (
        <div className="w-[320px]">
          <Timeline>
            <Timeline.Item
              title="Nov 6, 10:14 AM"
              expandable
              expanded={expanded}
              onExpandedChange={setExpanded}
              expandLabel="children"
              onSelect={() => {
                setExpanded(true);
                setSelected(children[0].id);
              }}
              data-testid="story-parent"
            >
              {children.map((child) => (
                <Timeline.Row key={child.id} selected={child.id === selected} onSelect={() => setSelected(child.id)}>
                  {child.label}
                </Timeline.Row>
              ))}
            </Timeline.Item>
          </Timeline>
        </div>
      );
    }
    return <SelectFirstChildStory />;
  },
};

/**
 * Every entry is its own box: it is flush with the list, so the list never exceeds its container and an
 * `overflow-hidden` frame clips nothing. The card (hover, selected) lines up with the container's header and edges;
 * the marker sits inside the card's padding.
 */
export const InsideOverflowHiddenContainer: Story = {
  render: () => {
    function FramedStory() {
      const [selected, setSelected] = useState("b");
      const [expanded, setExpanded] = useState(true);
      return (
        <div
          className="w-[320px] overflow-hidden rounded-small border border-neutral-border bg-neutral-surface"
          data-testid="story-frame"
        >
          <div className="border-b border-neutral-border px-tight py-tight text-neutral-content-subtle">Header</div>
          <Timeline>
            <Timeline.Item
              icon={<FileDottedIcon size={ICON_SIZE} />}
              title="Latest entry"
              selected={selected === "a"}
              onSelect={() => setSelected("a")}
            />
            <Timeline.Item
              title="Nov 6, 10:14 AM"
              description="Ada Author · 9 changes"
              selected={selected === "b"}
              onSelect={() => setSelected("b")}
              expandable
              expanded={expanded}
              onExpandedChange={setExpanded}
              expandLabel="details for Nov 6, 10:14 AM"
              actions={<RowKebab label="Actions for Nov 6, 10:14 AM" />}
            >
              <Timeline.Row selected={selected === "b-1"} onSelect={() => setSelected("b-1")}>
                Introduction · 3 edits
              </Timeline.Row>
              <Timeline.Row selected={selected === "b-2"} onSelect={() => setSelected("b-2")}>
                Chapter 1 · 5 edits
              </Timeline.Row>
            </Timeline.Item>
            <Timeline.Item icon={<FlagIcon size={ICON_SIZE} />} emphasis="subtle" title="Created" />
            <Timeline.LoadMore hasMore onLoadMore={() => {}} caption="Showing 3 of 40" />
          </Timeline>
        </div>
      );
    }
    return <FramedStory />;
  },
};
