import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import { createRef, forwardRef, PureComponent, useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";

import { FF_DEV_3391, isFF } from "../../utils/feature-flags";
import { isDefined, wrapArray } from "../../utils/utilities";
import NodesConnector from "./NodesConnector";

import styles from "./RelationsOverlay.module.css";

const ArrowMarker = ({ id, color }) => {
  return (
    <marker
      id={`arrow-${id}`}
      viewBox="0 0 10 10"
      refX={8}
      refY={5}
      markerWidth={4}
      markerHeight={4}
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
};

const RelationItemRect = ({ x, y, width, height }) => {
  return <rect x={x} y={y} width={width} height={height} fill="none" />;
};

const RelationConnector = ({ id, command, color, direction, highlight }) => {
  const pathColor = highlight ? "#fa541c" : color;
  const pathSettings = {
    d: command,
    stroke: pathColor,
    fill: "none",
    strokeLinecap: "round",
  };

  const markers = {};

  if (direction === "bi" || direction === "right") {
    markers.markerEnd = `url(#arrow-${id})`;
  }
  if (direction === "bi" || direction === "left") {
    markers.markerStart = `url(#arrow-${id})`;
  }

  return (
    <>
      <defs>
        <ArrowMarker id={id} color={pathColor} />
      </defs>
      {highlight && <path {...pathSettings} stroke={color} opacity={0.1} strokeWidth={6} />}
      <path {...pathSettings} opacity={highlight ? 1 : 0.6} strokeWidth={2} {...markers} />
    </>
  );
};

const RelationLabel = ({ label, position }) => {
  const [x, y] = position;
  const textRef = useRef();
  const [background, setBackground] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const groupAttributes = {
    transform: `translate(${x}, ${y})`,
    textAnchor: "middle",
    dominantBaseline: "middle",
  };

  const textAttributes = {
    fill: "white",
    style: { fontSize: 12, fontFamily: "arial" },
  };

  useEffect(() => {
    const textElement = textRef.current;
    const bbox = textElement.getBBox();

    setBackground({
      x: bbox.x - 5,
      y: bbox.y - 3,
      width: bbox.width + 10,
      height: bbox.height + 6,
    });
  }, [label]);

  return (
    <g {...groupAttributes}>
      <rect {...background} stroke="#fff" strokeWidth={2} fill="#a0a" rx="3" />
      <text ref={textRef} {...textAttributes}>
        {label}
      </text>
    </g>
  );
};

const RelationItem = ({ id, startNode, endNode, direction, rootRef, highlight, dimm, labels, visible }) => {
  const root = rootRef.current;
  const nodesHidden = startNode.hidden === true || endNode.hidden === true;
  const hideConnection = nodesHidden || !visible;
  const [, forceUpdate] = useState();

  // A connection owns a watcher per endpoint - a MutationObserver, or a set of
  // MobX observers on the region and on its parent tag. Building it in the
  // render body leaks a fresh set of those on every single render, so it is
  // memoized on the identity of the two nodes. `direction` and `labels` are
  // deliberately left out: they only change what we draw, not what we observe.
  const connection = useMemo(
    () => (root ? NodesConnector.connect({ id, startNode, endNode }, root) : null),
    [id, startNode, endNode, root],
  );

  useEffect(() => {
    if (!connection) return;

    connection.onChange(() => forceUpdate({}));
    return () => connection.destroy();
  }, [connection]);

  if (!connection) return null;

  // Geometry stays in the render body on purpose: it reads live DOM and canvas
  // state, and that is what makes the `shouldUpdate` scroll/resize signal work.
  const { start, end } = NodesConnector.getNodesBBox({ root, ...connection });
  const [path, textPosition] = NodesConnector.calculatePath(start, end);

  if (start.width < 1 || start.height < 1 || end.width < 1 || end.height < 1) return null;

  const label = wrapArray(labels ?? []).join(", ");

  const itemStyles = [styles.relationItem];
  if (highlight) {
    itemStyles.push(styles._highlighted);
  }

  return (
    <g id={id} className={itemStyles.join(" ")} visibility={hideConnection ? "hidden" : "visible"}>
      <RelationItemRect {...start} />
      <RelationItemRect {...end} />
      <RelationConnector id={id} command={path} color={connection.color} direction={direction} highlight={highlight} />
      {label && <RelationLabel label={label} position={textPosition} />}
    </g>
  );
};

const regionElement = (node) => (node?.getRegionElement ? node.getRegionElement() : node);

const nodesAreMounted = (startNode, endNode) =>
  isDefined(regionElement(startNode)) && isDefined(regionElement(endNode));

/**
 * @param {{
 * item: object,
 * rootRef: React.RefObject<HTMLElement>
 * }}
 */
const RelationItemObserver = observer(({ relation, startNode, endNode, visible, ...rest }) => {
  const [render, setRender] = useState(() => nodesAreMounted(startNode, endNode));

  useEffect(() => {
    let timer;

    // Some regions hand out their element through a React ref or a DOM query
    // (classifications, TextArea), which MobX cannot observe, so we poll until
    // it shows up. The nodes have to be re-read inside the tick: a list
    // captured at render time can never see the element appear.
    const watchRegionAppear = () => {
      const nodesExist = nodesAreMounted(startNode, endNode);

      if (render !== nodesExist) {
        setRender(nodesExist);
      } else if (!nodesExist) {
        timer = setTimeout(watchRegionAppear, 30);
      }
    };

    timer = setTimeout(watchRegionAppear, 30);

    return () => clearTimeout(timer);
  }, [startNode, endNode, render]);

  const visibility = visible && relation.visible;

  return render && relation.shouldRender ? (
    <RelationItem
      id={relation.id}
      startNode={startNode}
      endNode={endNode}
      direction={relation.direction}
      visible={visibility}
      labels={relation.selectedValues}
      {...rest}
    />
  ) : null;
});

class RelationsOverlay extends PureComponent {
  /** @type {React.RefObject<HTMLElement>} */
  rootNode = createRef();
  timer = null;
  state = {
    shouldRender: false,
    shouldRenderConnections: 0,
  };

  // Children read `rootNode.current` during render, so they stay gated until the
  // ref is attached. The overlay used to get that second pass for free, from
  // being remounted on every App render; now it asks for it explicitly.
  componentDidMount() {
    this.flushShouldRender();
  }

  componentDidUpdate() {
    this.flushShouldRender();
  }

  flushShouldRender() {
    if (this.rootNode.current && !this.state.shouldRender) {
      this.setState({ shouldRender: true });
    }
  }

  render() {
    const { relations, visible, highlighted } = this.props;
    const hasHighlight = !!highlighted;

    const style = {
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      position: "absolute",
      pointerEvents: "none",
      zIndex: 100,
    };

    const containerStyles = ["relations-overlay", styles.container];
    if (hasHighlight) {
      containerStyles.push(styles._highlighting);
    }

    return (
      <AutoSizer onResize={this.onResize}>
        {() => (
          <svg
            className={containerStyles.join(" ")}
            ref={this.rootNode}
            xmlns="http://www.w3.org/2000/svg"
            style={style}
          >
            <title>{this.state.shouldRender ? "Arrow Marker" : ""}</title>
            {this.state.shouldRender && this.renderRelations(relations, visible, hasHighlight, highlighted)}
            {
              // moving a highlighted relation into the foreground
              highlighted ? <use xlinkHref={`#${highlighted.id}`} /> : null
            }
          </svg>
        )}
      </AutoSizer>
    );
  }

  renderRelations(relations, visible, hasHighlight, highlightedRelation) {
    return relations.map((relation) => {
      const highlighted = highlightedRelation === relation;

      return (
        <RelationItemObserver
          key={relation.id}
          relation={relation}
          rootRef={this.rootNode}
          startNode={relation.node1}
          endNode={relation.node2}
          dimm={hasHighlight && !highlighted}
          highlight={highlighted}
          visible={highlighted || visible}
          shouldUpdate={this.state.shouldRenderConnections}
        />
      );
    });
  }

  onResize = () => {
    this.setState(({ shouldRenderConnections }) => ({ shouldRenderConnections: shouldRenderConnections + 1 }));
  };
}

const RelationObserverView = observer(RelationsOverlay);

const RelationsOverlayObserver = observer(
  forwardRef(({ store }, ref) => {
    const { relations, showConnections, highlighted } = store;

    return (
      <RelationObserverView
        ref={ref}
        relations={Array.from(relations)}
        visible={showConnections}
        highlighted={highlighted}
      />
    );
  }),
);

let readinessTimer = null;

const checkTagsAreReady = (tags, callback) => {
  clearTimeout(readinessTimer);

  if (isFF(FF_DEV_3391)) {
    if (![...tags.values()].every(isAlive)) return false;
  } else {
    if (!isAlive(tags)) return;
  }

  const ready = Array.from(tags.values()).reduce((res, tag) => {
    return res && (tag?.isReady ?? true);
  }, true);

  callback(ready);

  if (!ready) {
    readinessTimer = setTimeout(() => {
      checkTagsAreReady(tags, callback);
    }, 100);
  }
};

/**
 * @todo Why not just to use container that checks if tags are ready
 *  and do not render any children until they are ready?
 * @see {@link CommentsOverlay}
 */
const EnsureTagsReady = observer(
  forwardRef(({ tags, taskData, ...props }, ref) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      checkTagsAreReady(tags, (readyState) => {
        setReady(readyState);
      });

      return () => clearTimeout(readinessTimer);
    }, [taskData, tags]);

    return ready && <RelationsOverlayObserver ref={ref} {...props} />;
  }),
);

export { EnsureTagsReady as RelationsOverlay, RelationObserverView as RelationsOverlayView };
