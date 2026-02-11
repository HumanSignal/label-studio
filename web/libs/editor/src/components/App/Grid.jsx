/**
 * Grid component for Compare view - renders annotation panels side-by-side
 * Added virtualization support for large annotation counts
 */

import React, { Component, useCallback, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import { Button, Tooltip } from "@humansignal/ui";
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { observer } from "mobx-react";
import styles from "./Grid.module.scss";
import { EntityTab } from "../AnnotationTabs/AnnotationTabs";
import { observe } from "mobx";
import Konva from "konva";
import { Annotation } from "./Annotation";
import { isDefined } from "../../utils/utilities";
import { FF_DEV_3391, isFF } from "../../utils/feature-flags";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { moveStylesBetweenHeadTags } from "../../utils/html";

const PANEL_WIDTH = 500; // Width of each annotation panel (approximately 50% of typical viewport)
const PANEL_GAP = 30; // Gap between panels (matches $gap in Grid.module.scss)
const VIRTUALIZATION_THRESHOLD = 10; // Only virtualize if more than this many annotations

/***** DON'T TRY THIS AT HOME *****/
/*
Grid renders a container which remains untouched all the process.
On every rerender it renders Item with next annotation in the list.
Rendered annotation is cloned into the container. And index of "current" annotation increases.
This triggers next rerender with next annotation until all the annotations are rendered.
*/

class Item extends Component {
  componentDidMount() {
    Promise.all(
      this.props.annotation.objects.map((o) => {
        // as the image has lazy load, and the image is not being added to the viewport
        // until it's loaded we need to skip the validation assuming that it's always ready,
        // otherwise we'll get a blank canvas
        if (o.type === "image") return Promise.resolve();

        return o.isReady
          ? Promise.resolve(o.isReady)
          : new Promise((resolve) => {
              const dispose = observe(o, "isReady", () => {
                dispose();
                resolve();
              });
            });
      }),
    ).then(() => {
      // ~2 ticks for canvas to be rendered and resized completely
      setTimeout(this.props.onFinish, 32);
    });
  }

  render() {
    return <Annotation root={this.props.root} annotation={this.props.annotation} />;
  }
}

const VirtualizedAnnotationPanel = observer(({ annotation, root, style, onSelect }) => {
  return (
    <div style={{ ...style, paddingRight: PANEL_GAP }}>
      <div id={`c-${annotation.id}`} style={{ position: "relative", height: "100%" }}>
        <EntityTab
          entity={annotation}
          onClick={() => onSelect(annotation)}
          prediction={annotation.type === "prediction"}
          bordered={false}
          style={{ height: 44 }}
        />
        <Annotation root={root} annotation={annotation} />
      </div>
    </div>
  );
});

const VirtualizedGrid = observer(({ store, annotations, root }) => {
  const listRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Filter visible annotations
  const visibleAnnotations = useMemo(() => annotations.filter((c) => !c.hidden), [annotations]);

  // Calculate panel width based on container (aim for ~50% width, min PANEL_WIDTH)
  const panelWidth = useMemo(() => {
    if (containerWidth > 0) {
      const halfWidth = Math.floor((containerWidth - PANEL_GAP) / 2);
      return Math.max(halfWidth, PANEL_WIDTH);
    }
    return PANEL_WIDTH;
  }, [containerWidth]);

  const totalWidth = visibleAnnotations.length * (panelWidth + PANEL_GAP);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Navigation states
  const isLeftDisabled = scrollOffset <= 0;
  const isRightDisabled = scrollOffset >= totalWidth - containerWidth;
  const showControls = totalWidth > containerWidth;

  const handleScroll = useCallback(({ scrollOffset: newOffset }) => {
    setScrollOffset(newOffset);
  }, []);

  const scrollLeft = useCallback(() => {
    if (listRef.current) {
      const newOffset = Math.max(0, scrollOffset - panelWidth - PANEL_GAP);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, panelWidth]);

  const scrollRight = useCallback(() => {
    if (listRef.current) {
      const maxOffset = totalWidth - containerWidth;
      const newOffset = Math.min(maxOffset, scrollOffset + panelWidth + PANEL_GAP);
      listRef.current.scrollTo(newOffset);
    }
  }, [scrollOffset, containerWidth, totalWidth, panelWidth]);

  const select = useCallback(
    (c) => {
      c.type === "annotation"
        ? store.selectAnnotation(c.id, { exitViewAll: true })
        : store.selectPrediction(c.id, { exitViewAll: true });
    },
    [store],
  );

  // Item data for virtualized list
  const itemData = useMemo(
    () => ({
      annotations: visibleAnnotations,
      root,
      onSelect: select,
    }),
    [visibleAnnotations, root, select],
  );

  // Row renderer
  const renderPanel = useCallback(({ index, style, data }) => {
    const annotation = data.annotations[index];
    return (
      <VirtualizedAnnotationPanel
        key={annotation.id}
        annotation={annotation}
        root={data.root}
        style={style}
        onSelect={data.onSelect}
      />
    );
  }, []);

  return (
    <div className={styles.containerVirtualized}>
      <div className={styles.grid} style={{ overflow: "hidden", height: "100%" }}>
        <AutoSizer>
          {({ width, height }) => {
            if (width !== containerWidth) {
              setContainerWidth(width);
            }
            return (
              <List
                ref={listRef}
                layout="horizontal"
                height={height}
                width={width}
                itemCount={visibleAnnotations.length}
                itemSize={panelWidth + PANEL_GAP}
                itemData={itemData}
                onScroll={handleScroll}
                overscanCount={2}
              >
                {renderPanel}
              </List>
            );
          }}
        </AutoSizer>
      </div>
      {showControls && (
        <>
          <Button
            size="small"
            look="string"
            onClick={scrollLeft}
            className={styles.left}
            aria-label="Move left"
            disabled={isLeftDisabled}
          >
            <LeftCircleOutlined />
          </Button>
          <Button
            size="small"
            look="string"
            onClick={scrollRight}
            className={styles.right}
            aria-label="Move right"
            disabled={isRightDisabled}
          >
            <RightCircleOutlined />
          </Button>
        </>
      )}
    </div>
  );
});

// Original Grid class component (used when FF is off or few annotations)
class GridClassComponent extends Component {
  state = {
    item: 0,
    loaded: new Set(),
  };
  container = React.createRef();

  shouldComponentUpdate(nextProps, nexState) {
    return (
      !nextProps.store.selected.selected ||
      nexState.item >= nextProps.annotations.length ||
      nextProps.annotations[nexState.item] === nextProps.store.selected
    );
  }

  componentDidMount() {
    if (!isFF(FF_DEV_3391) && this.props.annotations[0] !== this.props.store.selected) {
      this.startRenderCycle();
    }
  }

  startRenderCycle() {
    this.renderNext(0);
  }

  renderNext(idx) {
    this.setState({ item: isDefined(idx) ? idx : this.state.item + 1 }, () => {
      if (this.state.item < this.props.annotations.length) {
        this.props.store._selectItem(this.props.annotations[this.state.item]);
      } else {
        this.props.store._unselectAll();
      }
    });
  }

  onFinish = () => {
    const c = this.container.current;

    if (!c) return;

    const itemWrapper = c.children[c.children.length - 1];
    const item = itemWrapper.children[itemWrapper.children.length - 1];
    const clone = item.cloneNode(true);

    c.children[this.state.item].appendChild(clone);

    // Force redraw
    Konva.stages.map((stage) => stage.draw());

    /* canvases are cloned empty, so clone their content */
    const sourceCanvas = item.querySelectorAll("canvas");
    const clonedCanvas = clone.querySelectorAll("canvas");

    clonedCanvas.forEach((canvas, i) => {
      canvas.getContext("2d").drawImage(sourceCanvas[i], 0, 0);
    });

    /*
      Procedure created style rules are not clonable so for
      iframe we should take care about them (highlight styles)
    */
    const sourceIframe = item.querySelectorAll("iframe");
    const clonedIframe = clone.querySelectorAll("iframe");

    clonedIframe.forEach((iframe, idx) => {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(sourceIframe[idx].contentDocument.documentElement.outerHTML);
      moveStylesBetweenHeadTags(sourceIframe[idx].contentDocument.head, iframe.contentDocument.head);
    });

    this.setState((state) => {
      return {
        ...state,
        loaded: new Set([...state.loaded, this.props.store.selected.id]),
      };
    });

    this.renderNext();
  };

  shift = (delta) => {
    const container = this.container.current;
    const children = container.children;

    const current = Array.from(children).findIndex((child) => container.scrollLeft <= child.offsetLeft);

    if (!container) return;

    const count = this.props.annotations.length;
    const next = current + delta;

    if (next < 0 || next > count - 1) return;
    const newPosition = children[next].offsetLeft;

    container.scrollTo({ left: newPosition, top: 0, behavior: "smooth" });
  };

  left = () => {
    this.shift(-1);
  };

  right = () => {
    this.shift(1);
  };

  select = (c) => {
    const { store } = this.props;

    c.type === "annotation"
      ? store.selectAnnotation(c.id, { exitViewAll: true })
      : store.selectPrediction(c.id, { exitViewAll: true });
  };

  render() {
    const i = this.state.item;
    const { annotations } = this.props;
    const selected = isFF(FF_DEV_3391) ? null : this.props.store.selected;
    const isRenderingNext = i < annotations.length && annotations[i] === selected;

    return (
      <div className={styles.container}>
        <div ref={this.container} className={styles.grid}>
          {annotations
            .filter((c) => !c.hidden)
            .map((c) => (
              <div id={`c-${c.id}`} key={`anno-${c.id}`} style={{ position: "relative" }}>
                <Tooltip title="Open Annotation Tab">
                  <div>
                    <EntityTab
                      entity={c}
                      onClick={() => this.select(c)}
                      prediction={c.type === "prediction"}
                      bordered={false}
                      style={{ height: 44 }}
                    />
                  </div>
                </Tooltip>
                {isFF(FF_DEV_3391) ? (
                  <Annotation root={this.props.root} annotation={c} />
                ) : (
                  !this.state.loaded.has(c.id) && (
                    <div
                      style={{
                        top: 0,
                        left: 0,
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  )
                )}
              </div>
            ))}
          {isRenderingNext && (
            <div id={"c-tmp"} key={"anno-tmp"} style={{ opacity: 0, position: "relative", right: 99999 }}>
              <EntityTab
                entity={selected}
                prediction={selected.type === "prediction"}
                bordered={false}
                style={{ height: 44 }}
              />
              <Item root={this.props.root} onFinish={this.onFinish} key={i} annotation={selected} />
            </div>
          )}
        </div>
        <Button size="small" look="string" onClick={this.left} className={styles.left} aria-label="Move left">
          <LeftCircleOutlined />
        </Button>
        <Button size="small" look="string" onClick={this.right} className={styles.right} aria-label="Move right">
          <RightCircleOutlined />
        </Button>
      </div>
    );
  }
}

export default function Grid(props) {
  const { annotations } = props;
  const visibleCount = annotations.filter((c) => !c.hidden).length;

  const shouldVirtualize = isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && visibleCount > VIRTUALIZATION_THRESHOLD;

  if (shouldVirtualize) {
    return <VirtualizedGrid {...props} />;
  }

  return <GridClassComponent {...props} />;
}
