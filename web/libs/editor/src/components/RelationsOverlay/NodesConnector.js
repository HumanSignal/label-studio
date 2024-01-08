import { debounce } from '../../utils/debounce';
import { wrapArray } from '../../utils/utilities';
import { Geometry } from './Geometry';
import { RelationShape } from './RelationShape';
import { createPropertyWatcher, DOMWatcher } from './watchers';

const parentImagePropsWatch = {
  parent: ['zoomScale', 'zoomingPositionX', 'zoomingPositionY', 'rotation', 'currentImage'],
};

const obtainWatcher = node => {
  switch (node.type) {
    case 'richtextregion':
    case 'audioregion':
    case 'paragraphs':
      return DOMWatcher;
    case 'rectangleregion':
      return createPropertyWatcher(['x', 'y', 'width', 'height', 'hidden', parentImagePropsWatch]);
    case 'ellipseregion':
      return createPropertyWatcher(['x', 'y', 'radiusX', 'radiusY', 'rotation', 'hidden', parentImagePropsWatch]);
    case 'polygonregion':
      return createPropertyWatcher(['hidden', { points: ['x', 'y'] }, parentImagePropsWatch]);
    case 'keypointregion':
      return createPropertyWatcher(['x', 'y', 'hidden', parentImagePropsWatch]);
    case 'brushregion':
      return createPropertyWatcher(['needsUpdate', 'hidden', 'touchesLength', parentImagePropsWatch]);
    case 'timeseriesregion':
      return createPropertyWatcher(['start', 'end', { parent: ['zoomedRange'] }]);
    default:
      return null;
  }
};

const createShape = (node, root) => {
  return new RelationShape({
    root,
    element: node,
    watcher: obtainWatcher(node),
  });
};

const connect = (relation, root) => {
  return {
    id: relation.id,
    label: wrapArray(relation.labels ?? []).join(', '),
    color: '#fa541c',
    direction: relation.direction,
    start: createShape(relation.startNode, root),
    end: createShape(relation.endNode, root),
    onChange(callback) {
      const onChangedCallback = debounce(callback, 50);

      this.start.onUpdate(onChangedCallback);
      this.end.onUpdate(onChangedCallback);
    },
    destroy() {
      this.start.destroy();
      this.end.destroy();
    },
  };
};

/**
 * Calculate BBox for the shape
 * @param {RelationShape} shape
 * @param {HTMLElement} root
 */
const calculateBBox = (shape, root) => {
  const { x, y } = Geometry.getDOMBBox(root, true) ?? { x: 0, y: 0 };
  const bboxList = shape.boundingBox();

  return bboxList.map(bbox => {
    const padded = Geometry.padding(bbox, 3);

    return {
      ...padded,
      x: padded.x - x,
      y: padded.y - y,
    };
  });
};

const getNodesBBox = ({ start, end, root }) => {
  const [startBBox, endBBox] = Geometry.closestRects(calculateBBox(start, root), calculateBBox(end, root));

  return {
    start: startBBox,
    end: endBBox,
  };
};

const shapesIntersect = ({ x1, y1, w1, x2, y2, w2 }) => {
  if (y1 === y2) return false;

  const leftIntersection = x1 <= x2 && x2 <= x1 + w1;
  const rightIntersection = x1 <= x2 + w2 && x2 + w2 <= x1 + w1;

  return leftIntersection || rightIntersection;
};

const calculateTopPath = ({ x1, y1, w1, x2, y2, w2, limit }) => {
  const xw1 = x1 + w1 * 0.5,
    xw2 = x2 + w2 * 0.5;

  const top = Math.min(y1, y2) - limit;
  const l1 = Math.min(top, y1 - limit);
  const l2 = Math.min(top, y2 - limit);

  const toEnd = xw1 < xw2 ? true : false;

  return { x1: xw1, x2: xw2, y1, y2, l1, l2, toEnd };
};

const calculateSidePath = ({ x1, y1, w1, h1, x2, y2, w2, h2, limit }) => {
  let renderingSide = 'left';

  if (Math.min(x1, x2) - limit < 0) {
    renderingSide = 'right';
  }

  let xs1, xs2, ys1, ys2, l1, l2;

  if (renderingSide === 'left') {
    xs1 = x1;
    ys1 = y1 + h1 * 0.5;
    xs2 = x2;
    ys2 = y2 + h2 * 0.5;
    const left = Math.min(xs1, xs2) - limit;

    l1 = Math.min(left, xs1 - limit);
    l2 = Math.min(left, xs2 - limit);
  } else {
    xs1 = x1 + w1;
    ys1 = y1 + h1 * 0.5;
    xs2 = x2 + w2;
    ys2 = y2 + h2 * 0.5;
    const left = Math.max(xs1, xs2) + limit;

    l1 = Math.max(left, xs1 + limit);
    l2 = Math.max(left, xs2 + limit);
  }

  const toEnd = ys1 < ys2 ? true : false;

  return { x1: xs1, x2: xs2, y1: ys1, y2: ys2, l1, l2, toEnd, renderingSide };
};

const buildPathCommand = ({ x1, y1, x2, y2, l1, l2, toEnd, renderingSide }, orientation) => {
  const radius = 5;
  const vertical = orientation === 'vertical';

  let px1, py1, px2, py2, px3, py3, px4, py4, sweep, arc1, arc2;
  let ex, ey;

  if (vertical) {
    px1 = x1;
    py1 = y1;
    px2 = x1;
    py2 = l1 + radius;
    px3 = x2 + radius * (toEnd ? -1 : 1);
    py3 = l2;
    px4 = x2;
    py4 = y2;
    sweep = toEnd ? 1 : 0;
    arc1 = toEnd ? `${radius} -${radius}` : `-${radius} -${radius}`;
    arc2 = toEnd ? `${radius} ${radius}` : `-${radius} ${radius}`;

    // Edge center coordinates
    ex = Math.min(x1, x2) + Math.abs(x2 - x1) / 2;
    ey = l1;
  } else if (!vertical && renderingSide === 'right') {
    px1 = x1;
    py1 = y1;
    px2 = l1 - radius;
    py2 = y1;
    px3 = l2;
    py3 = y2 + radius * (toEnd ? -1 : 1);
    px4 = x2;
    py4 = y2;
    sweep = toEnd ? 1 : 0;
    arc1 = toEnd ? `${radius} ${radius}` : `${radius} -${radius}`;
    arc2 = toEnd ? `-${radius} ${radius}` : `-${radius} -${radius}`;

    // Edge center coordinates
    ex = l1;
    ey = Math.min(y1, y2) + Math.abs(y2 - y1) / 2;
  } else if (!vertical && renderingSide === 'left') {
    px1 = x1;
    py1 = y1;
    px2 = l1 + radius;
    py2 = y1;
    px3 = l2;
    py3 = y2 + radius * (toEnd ? -1 : 1);
    px4 = x2;
    py4 = y2;
    sweep = toEnd ? 0 : 1;
    arc1 = toEnd ? `-${radius} ${radius}` : `-${radius} -${radius}`;
    arc2 = toEnd ? `${radius} ${radius}` : `${radius} -${radius}`;

    // Edge center coordinates
    ex = l1;
    ey = Math.min(y1, y2) + Math.abs(y2 - y1) / 2;
  }

  const pathCommand = [
    `M ${px1} ${py1}`,
    `${px2} ${py2}`,
    `a 5 5 0 0 ${sweep} ${arc1}`, // rounded corner
    `L ${px3} ${py3}`,
    `a 5 5 0 0 ${sweep} ${arc2}`, // rounded corner
    `L ${px4} ${py4}`,
  ];

  return [pathCommand.join(' '), [ex, ey]];
};

const calculatePath = (start, end) => {
  const { x: x1, y: y1, width: w1, height: h1 } = start;
  const { x: x2, y: y2, width: w2, height: h2 } = end;

  const limit = 15;

  const intersecting = shapesIntersect({
    x1,
    y1,
    w1,
    x2,
    y2,
    w2,
  });

  const coordinatesCalculator = intersecting ? calculateSidePath : calculateTopPath;
  const coordinates = coordinatesCalculator({
    x1,
    y1,
    w1,
    h1,
    x2,
    y2,
    w2,
    h2,
    limit,
  });

  const pathCommand = buildPathCommand(coordinates, intersecting ? 'horizontal' : 'vertical');

  return pathCommand;
};

export default {
  obtainWatcher,
  createShape,
  connect,
  getNodesBBox,
  calculatePath,
};
