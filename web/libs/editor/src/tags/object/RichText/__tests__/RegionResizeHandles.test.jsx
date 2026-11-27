/**
 * Unit tests for RegionResizeHandles (tags/object/RichText/RegionResizeHandles.jsx)
 */
import { act, render } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { RESIZE_HANDLE_TAG } from "../../../../mixins/HighlightMixin";
import { RegionResizeHandles } from "../RegionResizeHandles";

const createSpans = (container, count = 2) =>
  Array.from({ length: count }, (_, i) => {
    const span = document.createElement("span");

    span.textContent = `part ${i}`;
    container.append(span);
    return span;
  });

const createRegion = (item, spans) => {
  // MST volatile `_spans` is observable by reference only, same here
  const region = observable(
    {
      parent: item,
      locked: false,
      _spans: spans,
      isReadOnly() {
        return region.locked || item.annotation.readOnly;
      },
    },
    { parent: observable.ref, _spans: observable.ref },
  );

  region.attachHandles = mock((targetSpans) => {
    const handles = [document.createElement(RESIZE_HANDLE_TAG), document.createElement(RESIZE_HANDLE_TAG)];

    targetSpans[0].prepend(handles[0]);
    targetSpans.at(-1).append(handles[1]);
    return () => handles.forEach((handle) => handle.remove());
  });

  return region;
};

const setup = ({ canResizeSpans = true } = {}) => {
  const container = document.createElement("div");

  document.body.append(container);

  const item = observable({
    canResizeSpans,
    annotation: observable({ highlightedNode: null, readOnly: false }, { highlightedNode: observable.ref }),
  });
  const region = createRegion(item, createSpans(container));
  const select = (node) => runInAction(() => (item.annotation.highlightedNode = node));
  const countHandles = () => container.querySelectorAll(RESIZE_HANDLE_TAG).length;

  render(<RegionResizeHandles item={item} />);

  return { container, item, region, select, countHandles };
};

describe("RegionResizeHandles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not attach handles when no region is selected", () => {
    const { region, countHandles } = setup();

    expect(region.attachHandles).not.toHaveBeenCalled();
    expect(countHandles()).toBe(0);
  });

  it("attaches handles to the selected region and removes them on unselect", () => {
    const { region, select, countHandles } = setup();

    act(() => select(region));
    expect(region.attachHandles).toHaveBeenCalledWith(region._spans);
    expect(countHandles()).toBe(2);

    act(() => select(null));
    expect(countHandles()).toBe(0);
  });

  it("removes handles when the selected region gets locked and restores them on unlock", () => {
    const { region, select, countHandles } = setup();

    act(() => select(region));
    expect(countHandles()).toBe(2);

    act(() => runInAction(() => (region.locked = true)));
    expect(countHandles()).toBe(0);

    act(() => runInAction(() => (region.locked = false)));
    expect(countHandles()).toBe(2);
  });

  it("does not attach handles to a region selected while locked", () => {
    const { region, select, countHandles } = setup();

    runInAction(() => (region.locked = true));
    act(() => select(region));

    expect(region.attachHandles).not.toHaveBeenCalled();
    expect(countHandles()).toBe(0);
  });

  it("removes handles when the object tag can't resize spans anymore", () => {
    const { item, region, select, countHandles } = setup();

    act(() => select(region));
    expect(countHandles()).toBe(2);

    act(() => runInAction(() => (item.canResizeSpans = false)));
    expect(countHandles()).toBe(0);
  });

  it("removes handles when the annotation becomes read-only", () => {
    const { item, region, select, countHandles } = setup();

    act(() => select(region));
    act(() => runInAction(() => (item.annotation.readOnly = true)));

    expect(countHandles()).toBe(0);
  });

  it("does not attach handles when spans can't be resized", () => {
    const { region, select, countHandles } = setup({ canResizeSpans: false });

    act(() => select(region));

    expect(region.attachHandles).not.toHaveBeenCalled();
    expect(countHandles()).toBe(0);
  });

  it("ignores selected regions of other object tags", () => {
    const { region, select, countHandles } = setup();
    const otherRegion = createRegion(observable({ annotation: {} }), region._spans);

    act(() => select(otherRegion));

    expect(otherRegion.attachHandles).not.toHaveBeenCalled();
    expect(countHandles()).toBe(0);
  });

  it("moves handles to the new spans when region's spans are recreated", () => {
    const { container, region, select, countHandles } = setup();

    act(() => select(region));
    const oldSpans = region._spans;
    const newSpans = createSpans(container, 3);

    act(() => runInAction(() => (region._spans = newSpans)));

    expect(oldSpans.some((span) => span.querySelector(RESIZE_HANDLE_TAG))).toBe(false);
    expect(newSpans[0].firstChild.tagName.toLowerCase()).toBe(RESIZE_HANDLE_TAG);
    expect(newSpans.at(-1).lastChild.tagName.toLowerCase()).toBe(RESIZE_HANDLE_TAG);
    expect(countHandles()).toBe(2);
  });

  it("moves handles to another region when selection changes", () => {
    const { container, item, region, select, countHandles } = setup();
    const otherRegion = createRegion(item, createSpans(container));

    act(() => select(region));
    act(() => select(otherRegion));

    expect(region._spans.some((span) => span.querySelector(RESIZE_HANDLE_TAG))).toBe(false);
    expect(otherRegion._spans[0].querySelector(RESIZE_HANDLE_TAG)).not.toBeNull();
    expect(countHandles()).toBe(2);
  });

  it("does nothing while the region has no spans", () => {
    const { region, select, countHandles } = setup();

    runInAction(() => (region._spans = null));
    act(() => select(region));

    expect(region.attachHandles).not.toHaveBeenCalled();
    expect(countHandles()).toBe(0);
  });
});
