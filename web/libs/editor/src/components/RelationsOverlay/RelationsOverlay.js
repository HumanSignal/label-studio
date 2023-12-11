import { observer } from 'mobx-react';
import { isAlive } from 'mobx-state-tree';
import { createRef, forwardRef, PureComponent, useEffect, useRef } from 'react';
import { useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { FF_DEV_3391, isFF } from '../../utils/feature-flags';
import { isDefined } from '../../utils/utilities';
import NodesConnector from './NodesConnector';

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
  const pathColor = highlight ? '#fa541c' : color;
  const pathSettings = {
    d: command,
    stroke: pathColor,
    fill: 'none',
    strokeLinecap: 'round',
  };

  const markers = {};

  if (direction === 'bi' || direction === 'right') {
    markers.markerEnd = `url(#arrow-${id})`;
  }
  if (direction === 'bi' || direction === 'left') {
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
    textAnchor: 'middle',
    dominantBaseline: 'middle',
  };

  const textAttributes = {
    fill: 'white',
    style: { fontSize: 12, fontFamily: 'arial' },
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

  const relation = NodesConnector.connect({ id, startNode, endNode, direction, labels }, root);
  const { start, end } = NodesConnector.getNodesBBox({ root, ...relation });
  const [path, textPosition] = NodesConnector.calculatePath(start, end);

  useEffect(() => {
    relation.onChange(() => forceUpdate({}));
    return () => relation.destroy();
  }, []);
  if (start.width < 1 || start.height < 1 || end.width < 1 || end.height < 1) return null;
  return (
    <g opacity={dimm && !highlight ? 0.5 : 1} visibility={hideConnection ? 'hidden' : 'visible'}>
      <RelationItemRect {...start} />
      <RelationItemRect {...end} />
      <RelationConnector
        id={relation.id}
        command={path}
        color={relation.color}
        direction={relation.direction}
        highlight={highlight}
      />
      {relation.label && <RelationLabel label={relation.label} position={textPosition} />}
    </g>
  );
};

/**
 * @param {{
 * item: object,
 * rootRef: React.RefObject<HTMLElement>
 * }}
 */
const RelationItemObserver = observer(({ relation, startNode, endNode, visible, ...rest }) => {
  const nodes = [
    startNode.getRegionElement
      ? startNode.getRegionElement()
      : startNode,
    endNode.getRegionElement
      ? endNode.getRegionElement()
      : endNode,
  ];

  const [render, setRender] = useState(nodes[0] && nodes[1]);

  useEffect(() => {
    let timer;

    const watchRegionAppear = () => {
      const nodesExist = isDefined(nodes[0]) && isDefined(nodes[1]);

      if (render !== nodesExist) {
        setRender(nodesExist);
      } else if (render === false) {
        timer = setTimeout(watchRegionAppear, 30);
      }
    };

    timer = setTimeout(watchRegionAppear, 30);

    return () => clearTimeout(timer);
  }, [nodes, render]);

  const visibility = visible && relation.visible;

  return (render && relation.shouldRender) ? (
    <RelationItem
      id={relation.id}
      startNode={startNode}
      endNode={endNode}
      direction={relation.direction}
      visible={visibility}
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
    shouldRenderConnections: Math.random(),
  };

  componentDidUpdate() {
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
      width: '100%',
      height: '100%',
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 100,
    };

    return (
      <AutoSizer onResize={this.onResize}>
        {() => (
          <svg className="relations-overlay" ref={this.rootNode} xmlns="http://www.w3.org/2000/svg" style={style}>
            {(this.state.shouldRender) && (
              this.renderRelations(relations, visible, hasHighlight, highlighted)
            )}
          </svg>
        )}
      </AutoSizer>
    );
  }

  renderRelations(relations, visible, hasHighlight, highlightedRelation) {
    return relations.map(relation => {
      const highlighted = highlightedRelation === relation;

      return (
        <RelationItemObserver
          key={relation.id}
          relation={relation}
          rootRef={this.rootNode}
          startNode={relation.node1}
          endNode={relation.node2}
          labels={relation.relations?.selectedValues()}
          dimm={hasHighlight && !highlighted}
          highlight={highlighted}
          visible={highlighted || visible}
          shouldUpdate={this.state.shouldRenderConnections}
        />
      );
    });
  }

  onResize = () => {
    this.setState({ shouldRenderConnections: Math.random() });
  };
}

const RelationObserverView = observer(RelationsOverlay);

const RelationsOverlayObserver = observer(
  forwardRef(({ store, tags }, ref) => {
    const { relations, showConnections, highlighted } = store;

    return (
      <RelationObserverView
        ref={ref}
        relations={Array.from(relations)}
        visible={showConnections}
        highlighted={highlighted}
        tags={Array.from(tags?.values?.() ?? [])}
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

const EnsureTagsReady = observer(
  forwardRef(({ tags, taskData, ...props }, ref) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      checkTagsAreReady(tags, (readyState) => {
        setReady(readyState);
      });

      return () => clearTimeout(readinessTimer);
    }, [taskData, tags]);

    return ready && (
      <RelationsOverlayObserver ref={ref} {...props} />
    );
  }),
);

export { EnsureTagsReady as RelationsOverlay };
