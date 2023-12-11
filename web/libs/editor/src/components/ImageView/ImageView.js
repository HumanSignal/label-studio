import React, {
  Component,
  createRef,
  forwardRef,
  Fragment,
  memo,
  useEffect,
  useRef,
  useState
} from 'react';
import { Group, Layer, Line, Rect, Stage } from 'react-konva';
import { observer } from 'mobx-react';
import { getEnv, getRoot, isAlive } from 'mobx-state-tree';

import ImageGrid from '../ImageGrid/ImageGrid';
import ImageTransformer from '../ImageTransformer/ImageTransformer';
import ObjectTag from '../../components/Tags/Object';
import Tree from '../../core/Tree';
import styles from './ImageView.module.scss';
import { errorBuilder } from '../../core/DataValidator/ConfigValidator';
import { chunks, findClosestParent } from '../../utils/utilities';
import Konva from 'konva';
import { LoadingOutlined } from '@ant-design/icons';
import { Toolbar } from '../Toolbar/Toolbar';
import { ImageViewProvider } from './ImageViewContext';
import { Hotkey } from '../../core/Hotkey';
import { useObserver } from 'mobx-react';
import ResizeObserver from '../../utils/resize-observer';
import { debounce } from '../../utils/debounce';
import Constants from '../../core/Constants';
import { fixRectToFit } from '../../utils/image';
import {
  FF_DBLCLICK_DELAY,
  FF_DEV_1285,
  FF_DEV_1442,
  FF_DEV_3077,
  FF_DEV_3793,
  FF_DEV_4081,
  FF_LSDV_4583_6,
  FF_LSDV_4711,
  FF_LSDV_4930, FF_ZOOM_OPTIM,
  isFF
} from '../../utils/feature-flags';
import { Pagination } from '../../common/Pagination/Pagination';
import { Image } from './Image';

Konva.showWarnings = false;

const hotkeys = Hotkey('Image');
const imgDefaultProps = {};

if (isFF(FF_LSDV_4711)) imgDefaultProps.crossOrigin = 'anonymous';

const splitRegions = (regions) => {
  const brushRegions = [];
  const shapeRegions = [];
  const l = regions.length;
  let i = 0;

  for (i; i < l; i++) {
    const region = regions[i];

    if (region.type === 'brushregion') {
      brushRegions.push(region);
    } else {
      shapeRegions.push(region);
    }
  }

  return {
    brushRegions,
    shapeRegions,
  };
};

const Region = memo(({ region, showSelected = false }) => {
  if (isFF(FF_DBLCLICK_DELAY)) {
    return useObserver(() => Tree.renderItem(region, region.annotation, true));
  }
  return useObserver(() => region.inSelection !== showSelected ? null : Tree.renderItem(region, region.annotation, false));
});

const RegionsLayer = memo(({ regions, name, useLayers, showSelected = false }) => {
  const content = regions.map((el) => (
    <Region key={`region-${el.id}`} region={el} showSelected={showSelected} />
  ));

  return useLayers === false ? (
    content
  ) : (
    <Layer name={name}>
      {content}
    </Layer>
  );
});

const Regions = memo(({ regions, useLayers = true, chunkSize = 15, suggestion = false, showSelected = false }) => {
  return (
    <ImageViewProvider value={{ suggestion }}>
      {(chunkSize ? chunks(regions, chunkSize) : regions).map((chunk, i) => (
        <RegionsLayer
          key={`chunk-${i}`}
          name={`chunk-${i}`}
          regions={chunk}
          useLayers={useLayers}
          showSelected={showSelected}
        />
      ))}
    </ImageViewProvider>
  );
});

const DrawingRegion = observer(({ item }) => {
  const { drawingRegion } = item;

  if (!drawingRegion) return null;
  if (item.multiImage && item.currentImage !== drawingRegion.item_index) return null;

  const Wrapper = drawingRegion && drawingRegion.type === 'brushregion' ? Fragment : Layer;

  return (
    <Wrapper>
      {drawingRegion ? <Region key={'drawing'} region={drawingRegion} /> : drawingRegion}
    </Wrapper>
  );
});

const SELECTION_COLOR = '#40A9FF';
const SELECTION_SECOND_COLOR = 'white';
const SELECTION_DASH = [3, 3];

/**
 * Multiple selected regions when transform is unavailable — just a box with anchors
 */
const SelectionBorders = observer(({ item, selectionArea }) => {
  const { selectionBorders: bbox } = selectionArea;

  if (!isFF(FF_DEV_3793)) {
    bbox.left = bbox.left * item.stageScale;
    bbox.right = bbox.right * item.stageScale;
    bbox.top = bbox.top * item.stageScale;
    bbox.bottom = bbox.bottom * item.stageScale;
  }

  const points = bbox ? [
    {
      x: bbox.left,
      y: bbox.top,
    },
    {
      x: bbox.right,
      y: bbox.top,
    },
    {
      x: bbox.left,
      y: bbox.bottom,
    },
    {
      x: bbox.right,
      y: bbox.bottom,
    },
  ] : [];
  const ANCHOR_SIZE = isFF(FF_DEV_3793) ? 6 / item.stageScale : 6;

  return (
    <>
      {bbox && (
        <Rect
          name="regions_selection"
          x={bbox.left}
          y={bbox.top}
          width={bbox.right - bbox.left}
          height={bbox.bottom - bbox.top}
          stroke={SELECTION_COLOR}
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
      {points.map((point, idx) => {
        return (
          <Rect
            key={idx}
            x={point.x - ANCHOR_SIZE / 2}
            y={point.y - ANCHOR_SIZE / 2}
            width={ANCHOR_SIZE}
            height={ANCHOR_SIZE}
            fill={SELECTION_COLOR}
            stroke={SELECTION_SECOND_COLOR}
            strokeWidth={2}
            strokeScaleEnabled={false}
            listening={false}
          />
        );
      })}
    </>
  );
});

/**
 * Selection area during selection — dashed rect
 */
const SelectionRect = observer(({ item }) => {
  const { x, y, width, height } = item.onCanvasRect;

  const positionProps = {
    x,
    y,
    width,
    height,
    listening: false,
    strokeWidth: 1,
  };

  return (
    <>
      <Rect
        {...positionProps}
        stroke={SELECTION_COLOR}
        dash={SELECTION_DASH}
        strokeScaleEnabled={false}
      />
      <Rect
        {...positionProps}
        stroke={SELECTION_SECOND_COLOR}
        dash={SELECTION_DASH}
        dashOffset={SELECTION_DASH[0]}
        strokeScaleEnabled={false}
      />
    </>
  );
});

const TRANSFORMER_BACK_ID = 'transformer_back';

const TransformerBack = observer(({ item }) => {
  const { selectedRegionsBBox } = item;
  const singleNodeMode = item.selectedRegions.length === 1;
  const dragStartPointRef = useRef({ x: 0, y: 0 });

  return (
    <Layer>
      {selectedRegionsBBox && !singleNodeMode && (
        <Rect
          id={TRANSFORMER_BACK_ID}
          fill="rgba(0,0,0,0)"
          draggable
          onClick={() => {
            item.annotation.unselectAreas();
          }}
          onMouseOver={(ev) => {
            if (!item.annotation.relationMode) {
              ev.target.getStage().container().style.cursor = Constants.POINTER_CURSOR;
            }
          }}
          onMouseOut={(ev) => {
            ev.target.getStage().container().style.cursor = Constants.DEFAULT_CURSOR;
          }}
          onDragStart={e => {
            dragStartPointRef.current = {
              x: item.canvasToInternalX(e.target.getAttr('x')),
              y: item.canvasToInternalY(e.target.getAttr('y')),
            };
          }}
          dragBoundFunc={(pos) => {
            let { x, y } = pos;
            const { top, left, right, bottom } = item.selectedRegionsBBox;
            const { stageHeight, stageWidth } = item;

            const offset = {
              x: dragStartPointRef.current.x - left,
              y: dragStartPointRef.current.y - top,
            };

            x -= offset.x;
            y -= offset.y;

            const bbox = { x, y, width: right - left, height: bottom - top };

            const fixed = fixRectToFit(bbox, stageWidth, stageHeight);

            if (fixed.width !== bbox.width) {
              x += (fixed.width - bbox.width) * (fixed.x !== bbox.x ? -1 : 1);
            }

            if (fixed.height !== bbox.height) {
              y += (fixed.height - bbox.height) * (fixed.y !== bbox.y ? -1 : 1);
            }

            x += offset.x;
            y += offset.y;
            return { x, y };
          }}
        />
      )}
    </Layer>
  );
});

const SelectedRegions = observer(({ item, selectedRegions }) => {
  if (!selectedRegions) return null;
  const { brushRegions = [], shapeRegions = [] } = splitRegions(selectedRegions);

  return (
    <>
      {
        isFF(FF_LSDV_4930)
          ? null
          : <TransformerBack item={item} />
      }
      {brushRegions.length > 0 && (
        <Regions
          key="brushes"
          name="brushes"
          regions={brushRegions}
          useLayers={false}
          showSelected
          chankSize={0}
        />
      )}

      {shapeRegions.length > 0 && (
        <Regions
          key="shapes"
          name="shapes"
          regions={shapeRegions}
          showSelected
          chankSize={0}
        />
      )}
    </>
  );
});

const SelectionLayer = observer(({ item, selectionArea }) => {
  const scale = isFF(FF_DEV_3793) ? 1 : 1 / (item.zoomScale || 1);
  const [isMouseWheelClick, setIsMouseWheelClick] = useState(false);
  const [shift, setShift] = useState(false);
  const isPanTool = item.getToolsManager().findSelectedTool()?.fullName === 'ZoomPanTool';

  const dragHandler = (e) => setIsMouseWheelClick(e.buttons === 4);

  const handleKey = (e) => setShift(e.shiftKey);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    window.addEventListener('mousedown', dragHandler);
    window.addEventListener('mouseup', dragHandler);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
      window.removeEventListener('mousedown', dragHandler);
      window.removeEventListener('mouseup', dragHandler);
    };
  }, []);

  const disableTransform = item.zoomScale > 1 && (shift || isPanTool || isMouseWheelClick);

  let supportsTransform = true;
  let supportsRotate = true;
  let supportsScale = true;

  item.selectedRegions?.forEach(shape => {
    supportsTransform = supportsTransform && shape.supportsTransform === true;
    supportsRotate = supportsRotate && shape.canRotate === true;
    supportsScale = supportsScale && true;
  });

  supportsTransform =
    supportsTransform &&
    (item.selectedRegions.length > 1 ||
      ((item.useTransformer || item.selectedShape?.preferTransformer) && item.selectedShape?.useTransformer));

  return (
    <Layer scaleX={scale} scaleY={scale}>
      {selectionArea.isActive ? (
        <SelectionRect item={selectionArea} />
      ) : !supportsTransform && item.selectedRegions.length > 1 ? (
        <SelectionBorders item={item} selectionArea={selectionArea} />
      ) : null}
      <ImageTransformer
        item={item}
        rotateEnabled={supportsRotate}
        supportsTransform={!disableTransform && supportsTransform}
        supportsScale={supportsScale}
        selectedShapes={item.selectedRegions}
        singleNodeMode={item.selectedRegions.length === 1}
        useSingleNodeRotation={item.selectedRegions.length === 1 && supportsRotate}
        draggableBackgroundSelector={`#${TRANSFORMER_BACK_ID}`}
      />
    </Layer>
  );
});

/**
 * Previously regions rerendered on window resize because of size recalculations,
 * but now they are rerendered just by mistake because of unmemoized `splitRegions` in main render.
 * This is temporary solution to pass in relevant props changed on window resize.
 */
const Selection = observer(({ item, ...triggeredOnResize }) => {
  const { selectionArea } = item;

  return (
    <>
      { isFF(FF_DBLCLICK_DELAY)
        ? <Layer name="selection-regions-layer" />
        : <SelectedRegions item={item} selectedRegions={item.selectedRegions} {...triggeredOnResize} />
      }
      <SelectionLayer item={item} selectionArea={selectionArea} />
    </>
  );
});

const Crosshair = memo(forwardRef(({ width, height }, ref) => {
  const [pointsV, setPointsV] = useState([50, 0, 50, height]);
  const [pointsH, setPointsH] = useState([0, 100, width, 100]);
  const [x, setX] = useState(100);
  const [y, setY] = useState(50);

  const [visible, setVisible] = useState(false);
  const strokeWidth = 1;
  const dashStyle = [3, 3];
  let enableStrokeScale = true;

  if (isFF(FF_DEV_1285)) {
    enableStrokeScale = false;
  }

  if (ref) {
    ref.current = {
      updatePointer(newX, newY) {
        if (newX !== x) {
          setX(newX);
          setPointsV([newX, 0, newX, height]);
        }

        if (newY !== y) {
          setY(newY);
          setPointsH([0, newY, width, newY]);
        }
      },
      updateVisibility(visibility) {
        setVisible(visibility);
      },
    };
  }

  return (
    <Layer
      name="crosshair"
      listening={false}
      opacity={visible ? 0.6 : 0}
    >
      <Group>
        <Line
          name="v-white"
          points={pointsH}
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeScaleEnabled={enableStrokeScale}
        />
        <Line
          name="v-black"
          points={pointsH}
          stroke="#000"
          strokeWidth={strokeWidth}
          dash={dashStyle}
          strokeScaleEnabled={enableStrokeScale}
        />
      </Group>
      <Group>
        <Line
          name="h-white"
          points={pointsV}
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeScaleEnabled={enableStrokeScale}
        />
        <Line
          name="h-black"
          points={pointsV}
          stroke="#000"
          strokeWidth={strokeWidth}
          dash={dashStyle}
          strokeScaleEnabled={enableStrokeScale}
        />
      </Group>
    </Layer>
  );
}));

export default observer(
  class ImageView extends Component {
    // stored position of canvas before creating region
    canvasX;
    canvasY;
    lastOffsetWidth = -1;
    lastOffsetHeight = -1;
    state = {
      imgStyle: {},
      pointer: [0, 0],
    };

    imageRef = createRef();
    crosshairRef = createRef();
    handleDeferredMouseDown = null;
    deferredClickTimeout = [];
    skipMouseUp = false;
    mouseDownPoint = null;

    constructor(props) {
      super(props);

      if (typeof props.item.smoothing === 'boolean')
        props.store.settings.setSmoothing(props.item.smoothing);
    }

    handleOnClick = e => {
      const { item } = this.props;

      if (isFF(FF_DEV_1442)) {
        this.handleDeferredMouseDown?.();
      }
      if (this.skipMouseUp) {
        this.skipMouseUp = false;
        return;
      }

      const evt = e.evt || e;
      const { offsetX: x, offsetY: y } = evt;

      if (isFF(FF_LSDV_4930)) {
        // Konva can trigger click even on simple mouseup
        // You can try drag and drop interaction here https://konvajs.org/docs/events/Stage_Events.html and check the console
        // So here is false trigger preventing
        if (
          !this.mouseDownPoint
          || Math.abs(this.mouseDownPoint.x - x) > 0.01
          || Math.abs(this.mouseDownPoint.y - y) > 0.01
        ) {
          this.mouseDownPoint = null;
          return;
        }
      }
      return item.event('click', evt, x, y);
    };

    resetDeferredClickTimeout = () => {
      if (this.deferredClickTimeout.length > 0) {
        this.deferredClickTimeout = this.deferredClickTimeout.filter((timeout) => {
          clearTimeout(timeout);
          return false;
        });
      }
    };

    handleDeferredClick = (handleDeferredMouseDownCallback, handleDeselection, eligibleToDeselect = false) => {
      this.handleDeferredMouseDown = () => {
        if (eligibleToDeselect) {
          handleDeselection();
        }
        handleDeferredMouseDownCallback();
        // mousedown should be called only once especially if it is called from mousemove interaction.
        this.handleDeferredMouseDown = null;
      };
      this.resetDeferredClickTimeout();
      this.deferredClickTimeout.push(setTimeout(() => {
        this.handleDeferredMouseDown?.();
      }, this.props.item.annotation.isDrawing ? 0 : 100));
    };

    handleMouseDown = e => {
      const { item } = this.props;
      const isPanTool = item.getToolsManager().findSelectedTool()?.fullName === 'ZoomPanTool';
      const isMoveTool = item.getToolsManager().findSelectedTool()?.fullName === 'MoveTool';

      if (isFF(FF_LSDV_4930)) {
        this.mouseDownPoint = { x: e.evt.offsetX, y: e.evt.offsetY };
      }

      item.updateSkipInteractions(e);

      const p = e.target.getParent();

      if (item.annotation.isReadOnly() && !isPanTool) return;
      if (p && p.className === 'Transformer') return;

      const handleMouseDown = () => {
        if (e.evt.button === 1) {
          // prevent middle click from scrolling page
          e.evt.preventDefault();
        }

        const isRightElementToCatchToolInteractions = el => {
          // It could be ruler ot segmentation
          if (el.nodeType === 'Group') {
            if ('ruler' === el?.attrs?.name) {
              return true;
            }
            // segmentation is specific for Brushes
            // but click interaction on the region covers the case of the same MoveTool interaction here,
            // so it should ignore move tool interaction to prevent conflicts
            if ((!isFF(FF_DBLCLICK_DELAY) || !isMoveTool)
              && 'segmentation' === el?.attrs?.name) {
              return true;
            }
          }
          return false;
        };

        if (
          // create regions over another regions with Cmd/Ctrl pressed
          item.getSkipInteractions() ||
          e.target === item.stageRef ||
          findClosestParent(
            e.target,
            isRightElementToCatchToolInteractions,
          )
        ) {
          window.addEventListener('mousemove', this.handleGlobalMouseMove);
          window.addEventListener('mouseup', this.handleGlobalMouseUp);
          const { offsetX: x, offsetY: y } = e.evt;
          // store the canvas coords for calculations in further events
          const { left, top } = item.containerRef.getBoundingClientRect();

          this.canvasX = left;
          this.canvasY = top;
          item.event('mousedown', e, x, y);

          return true;
        }
      };

      const selectedTool = item.getToolsManager().findSelectedTool();
      const eligibleToolForDeselect = [
        undefined,
        'EllipseTool',
        'EllipseTool-dynamic',
        'RectangleTool',
        'RectangleTool-dynamic',
        'PolygonTool',
        'PolygonTool-dynamic',
        'Rectangle3PointTool',
        'Rectangle3PointTool-dynamic',
      ].includes(selectedTool?.fullName);

      if (isFF(FF_DEV_1442) && eligibleToolForDeselect) {
        const targetIsCanvas = e.target === item.stageRef;
        const annotationHasSelectedRegions = item.annotation.selectedRegions.length > 0;
        const eligibleToDeselect = targetIsCanvas && annotationHasSelectedRegions;

        const handleDeselection = () => {
          item.annotation.unselectAll();
          this.skipMouseUp = true;
        };

        this.handleDeferredClick(handleMouseDown, handleDeselection, eligibleToDeselect);
        return;
      }

      const result = handleMouseDown();

      if (result) return result;

      return true;
    };

    /**
     * Mouse up outside the canvas
     */
    handleGlobalMouseUp = e => {
      window.removeEventListener('mousemove', this.handleGlobalMouseMove);
      window.removeEventListener('mouseup', this.handleGlobalMouseUp);

      if (e.target && e.target.tagName === 'CANVAS') return;

      const { item } = this.props;
      const { clientX: x, clientY: y } = e;

      item.freezeHistory();

      return item.event('mouseup', e, x - this.canvasX, y - this.canvasY);
    };

    handleGlobalMouseMove = e => {
      if (e.target && e.target.tagName === 'CANVAS') return;

      const { item } = this.props;
      const { clientX: x, clientY: y } = e;

      return item.event('mousemove', e, x - this.canvasX, y - this.canvasY);
    };

    /**
     * Mouse up on Stage
     */
    handleMouseUp = e => {
      const { item } = this.props;

      if (isFF(FF_DEV_1442)) {
        this.resetDeferredClickTimeout();
      }

      item.freezeHistory();
      item.setSkipInteractions(false);

      return item.event('mouseup', e, e.evt.offsetX, e.evt.offsetY);
    };

    handleMouseMove = e => {
      const { item } = this.props;

      item.freezeHistory();

      this.updateCrosshair(e);

      const isMouseWheelClick = e.evt && e.evt.buttons === 4;
      const isDragging = e.evt && e.evt.buttons === 1;
      const isShiftDrag = isDragging && e.evt.shiftKey;

      if (isFF(FF_DEV_1442) && isDragging) {
        this.resetDeferredClickTimeout();
        this.handleDeferredMouseDown?.();
      }

      if ((isMouseWheelClick || isShiftDrag) && item.zoomScale > 1) {
        item.setSkipInteractions(true);
        e.evt.preventDefault();

        const newPos = {
          x: item.zoomingPositionX + e.evt.movementX,
          y: item.zoomingPositionY + e.evt.movementY,
        };

        item.setZoomPosition(newPos.x, newPos.y);
      } else {
        item.event('mousemove', e, e.evt.offsetX, e.evt.offsetY);
      }
    };

    updateCrosshair = (e) => {
      if (this.crosshairRef.current) {
        const { x, y } = e.currentTarget.getPointerPosition();

        if (isFF(FF_DEV_1285)) {
          this.crosshairRef.current.updatePointer(...this.props.item.fixZoomedCoords([x, y]));
        } else {
          this.crosshairRef.current.updatePointer(x, y);
        }
      }
    };

    handleError = () => {
      const { item, store } = this.props;
      const cs = store.annotationStore;
      const message = getEnv(store).messages.ERR_LOADING_HTTP({
        attr: item.value,
        error: '',
        url: item.currentSrc,
      });

      cs.addErrors([errorBuilder.generalError(message)]);
    };

    updateGridSize = range => {
      const { item } = this.props;

      item.freezeHistory();

      item.setGridSize(range);
    };

    /**
     * Handle to zoom
     */
    handleZoom = e => {
      /**
       * Disable if user doesn't use ctrl
       */
      if (e.evt && !e.evt.ctrlKey) {
        return;
      } else if (e.evt && e.evt.ctrlKey) {
        /**
         * Disable scrolling page
         */
        e.evt.preventDefault();
      }
      if (e.evt) {
        const { item } = this.props;
        const stage = item.stageRef;

        item.handleZoom(e.evt.deltaY, stage.getPointerPosition());
      }
    };

    renderRulers() {
      const { item } = this.props;
      const width = 1;
      const color = 'white';

      return (
        <Group
          name="ruler"
          onClick={ev => {
            ev.cancelBubble = false;
          }}
        >
          <Line
            x={0}
            y={item.cursorPositionY}
            points={[0, 0, item.stageWidth, 0]}
            strokeWidth={width}
            stroke={color}
            tension={0}
            dash={[4, 4]}
            closed
          />
          <Line
            x={item.cursorPositionX}
            y={0}
            points={[0, 0, 0, item.stageHeight]}
            strokeWidth={width}
            stroke={color}
            tension={0}
            dash={[1.5]}
            closed
          />
        </Group>
      );
    }

    onResize = debounce(() => {
      if (!this?.props?.item?.containerRef) return;
      const { offsetWidth, offsetHeight } = this.props.item.containerRef;

      if (this.props.item.naturalWidth <= 1) return;
      if (this.lastOffsetWidth === offsetWidth && this.lastOffsetHeight === offsetHeight) return;

      this.props.item.onResize(offsetWidth, offsetHeight, true);
      this.lastOffsetWidth = offsetWidth;
      this.lastOffsetHeight = offsetHeight;
    }, 16);

    componentDidMount() {
      const { item } = this.props;

      window.addEventListener('resize', this.onResize);
      this.attachObserver(item.containerRef);
      this.updateReadyStatus();

      hotkeys.addDescription('shift', 'Pan image');
    }

    attachObserver = (node) => {
      if (this.resizeObserver) this.detachObserver();

      if (node) {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(node);
      }
    };

    detachObserver = () => {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    };

    componentWillUnmount() {
      this.detachObserver();
      window.removeEventListener('resize', this.onResize);

      hotkeys.removeDescription('shift');
    }

    componentDidUpdate() {
      this.onResize();
      this.updateReadyStatus();
    }

    updateReadyStatus() {
      const { item } = this.props;
      const { imageRef } = this;

      if (!item || !isAlive(item) || !imageRef.current) return;
      if (item.isReady !== imageRef.current.complete) item.setReady(imageRef.current.complete);
    }

    renderTools() {
      const { item, store } = this.props;
      const cs = store.annotationStore;

      if (cs.viewingAllAnnotations || cs.viewingAllPredictions) return null;

      const tools = item.getToolsManager().allTools();

      return (
        <Toolbar tools={tools} />
      );
    }

    render() {

      const { item, store } = this.props;

      // @todo stupid but required check for `resetState()`
      // when Image tries to render itself after detouching
      if (!isAlive(item)) return null;

      // TODO fix me
      if (!store.task || !item.currentSrc) return null;

      const containerStyle = {};

      const containerClassName = styles.container;

      const paginationEnabled = !!item.isMultiItem;

      if (getRoot(item).settings.fullscreen === false) {
        containerStyle['maxWidth'] = item.maxwidth;
        containerStyle['maxHeight'] = item.maxheight;
        containerStyle['width'] = item.width;
        containerStyle['height'] = item.height;
      }

      if (!store.settings.enableSmoothing && item.zoomScale > 1) {
        containerStyle['imageRendering'] = 'pixelated';
      }

      const imagePositionClassnames = [
        styles['image_position'],
        styles[`image_position__${item.verticalalignment === 'center' ? 'middle' : item.verticalalignment}`],
        styles[`image_position__${item.horizontalalignment}`],
      ];

      const wrapperClasses = [
        styles.wrapperComponent,
        item.images.length > 1 ? styles.withGallery : styles.wrapper,
      ];

      if (paginationEnabled) wrapperClasses.push(styles.withPagination);

      const [toolsReady, stageLoading] = isFF(FF_LSDV_4583_6) ? [true, false] : [
        item.hasTools, item.stageWidth <= 1,
      ];

      const imageIsLoaded = (
        item.imageIsLoaded
      ) || !isFF(FF_LSDV_4583_6);

      return (
        <ObjectTag
          item={item}
          className={wrapperClasses.join(' ')}
        >
          {paginationEnabled ? (
            <div className={styles.pagination}>
              <Pagination
                size="small"
                outline={false}
                align="left"
                noPadding
                hotkey={{
                  prev: 'image:prev',
                  next: 'image:next',
                }}
                currentPage={item.currentImage + 1}
                totalPages={item.parsedValueList.length}
                onChange={n => item.setCurrentImage(n - 1)}
                pageSizeSelectable={false}
              />
            </div>
          ) : null}

          <div
            ref={node => {
              item.setContainerRef(node);
              this.attachObserver(node);
            }}
            className={containerClassName}
            style={containerStyle}
          >
            <div
              ref={node => {
                this.filler = node;
              }}
              className={styles.filler}
              style={{ width: '100%', marginTop: item.fillerHeight }}
            />

            {isFF(FF_LSDV_4583_6) ? (
              <Image
                ref={ref => {
                  item.setImageRef(ref);
                  this.imageRef.current = ref;
                }}
                usedValue={item.usedValue}
                imageEntity={item.currentImageEntity}
                imageTransform={item.imageTransform}
                updateImageSize={item.updateImageSize}
                size={item.canvasSize}
              />
            ) : (
              <div
                className={[
                  styles.frame,
                  ...imagePositionClassnames,
                ].join(' ')}
                style={item.canvasSize}
              >
                <img
                  ref={ref => {
                    item.setImageRef(ref);
                    this.imageRef.current = ref;
                  }}
                  loading={(isFF(FF_DEV_3077) && !item.lazyoff) && 'lazy'}
                  style={item.imageTransform}
                  src={item.currentSrc}
                  onLoad={(e) => {
                    item.updateImageSize(e);
                    item.currentImageEntity.setImageLoaded(true);
                  }}
                  onError={this.handleError}
                  crossOrigin={item.imageCrossOrigin}
                  alt="LS"
                />
                {isFF(FF_DEV_4081) ? (
                  <canvas
                    className={styles.overlay}
                    ref={ref => {
                      item.setOverlayRef(ref);
                    }}
                    style={item.imageTransform}
                  />
                ) : null}
              </div>
            )}
            {/* @todo this is dirty hack; rewrite to proper async waiting for data to load */}
            {stageLoading || !toolsReady ? (
              <div className={styles.loading}><LoadingOutlined /></div>
            ) : (imageIsLoaded) ? (
              <EntireStage
                item={item}
                crosshairRef={this.crosshairRef}
                onClick={this.handleOnClick}
                imagePositionClassnames={imagePositionClassnames}
                state={this.state}
                onMouseEnter={() => {
                  if (this.crosshairRef.current) {
                    this.crosshairRef.current.updateVisibility(true);
                  }
                }}
                onMouseLeave={(e) => {
                  if (this.crosshairRef.current) {
                    this.crosshairRef.current.updateVisibility(false);
                  }
                  const { width: stageWidth, height: stageHeight } = item.canvasSize;
                  const { offsetX: mouseposX, offsetY: mouseposY } = e.evt;
                  const newEvent = { ...e };

                  if (mouseposX <= 0) {
                    e.offsetX = 0;
                  } else if (mouseposX >= stageWidth) {
                    e.offsetX = stageWidth;
                  }

                  if (mouseposY <= 0) {
                    e.offsetY = 0;
                  } else if (mouseposY >= stageHeight) {
                    e.offsetY = stageHeight;
                  }
                  this.handleMouseMove(newEvent);
                }}
                onDragMove={this.updateCrosshair}
                onMouseDown={this.handleMouseDown}
                onMouseMove={this.handleMouseMove}
                onMouseUp={this.handleMouseUp}
                onWheel={item.zoom ? this.handleZoom : () => {
                }}
              />
            ) : null}
          </div>

          {toolsReady && imageIsLoaded && this.renderTools()}
          {item.images.length > 1 && (
            <div className={styles.gallery}>
              {item.images.map((src, i) => (
                <img
                  {...imgDefaultProps}
                  alt=""
                  key={src}
                  src={src}
                  className={i === item.currentImage && styles.active}
                  height="60"
                  onClick={() => item.setCurrentImage(i)}
                />
              ))}
            </div>
          )}
        </ObjectTag>
      );
    }
  },
);

const EntireStage = observer(({
  item,
  imagePositionClassnames,
  state,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragMove,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  crosshairRef,
}) => {
  const { store } = item;
  let size, position;

  if (isFF(FF_ZOOM_OPTIM)) {
    size = {
      width: item.containerWidth,
      height: item.containerHeight,
    };
    position = {
      x: item.zoomingPositionX + item.alignmentOffset.x,
      y: item.zoomingPositionY + item.alignmentOffset.y,
    };
  } else {
    size = { ...item.canvasSize };
    position = {
      x: item.zoomingPositionX,
      y: item.zoomingPositionY,
    };
  }

  return (
    <Stage
      ref={ref => {
        item.setStageRef(ref);
      }}
      className={[styles['image-element'],
        ...imagePositionClassnames,
      ].join(' ')}
      width={size.width}
      height={size.height}
      scaleX={item.zoomScale}
      scaleY={item.zoomScale}
      x={position.x}
      y={position.y}
      offsetX={item.stageTranslate.x}
      offsetY={item.stageTranslate.y}
      rotation={item.rotation}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragMove={onDragMove}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <StageContent
        item={item}
        store={store}
        state={state}
        crosshairRef={crosshairRef}
      />
    </Stage>
  );
});

const StageContent = observer(({
  item,
  store,
  state,
  crosshairRef,
}) => {
  if (!isAlive(item)) return null;
  if (!store.task || !item.currentSrc) return null;

  const regions = item.regs;
  const paginationEnabled = !!item.isMultiItem;
  const wrapperClasses = [
    styles.wrapperComponent,
    item.images.length > 1 ? styles.withGallery : styles.wrapper,
  ];

  if (paginationEnabled) wrapperClasses.push(styles.withPagination);

  const {
    brushRegions,
    shapeRegions,
  } = splitRegions(regions);

  const {
    brushRegions: suggestedBrushRegions,
    shapeRegions: suggestedShapeRegions,
  } = splitRegions(item.suggestions);

  const renderableRegions = Object.entries({
    brush: brushRegions,
    shape: shapeRegions,
    suggestedBrush: suggestedBrushRegions,
    suggestedShape: suggestedShapeRegions,
  });

  return (
    <>
      {/* Hack to keep stage in place when there's no regions */}
      {regions.length === 0 && (
        <Layer>
          <Line points={[0, 0, 0, 1]} stroke="rgba(0,0,0,0)" />
        </Layer>
      )}
      {item.grid && item.sizeUpdated && <ImageGrid item={item} />}

      {
        isFF(FF_LSDV_4930)
          ? <TransformerBack item={item} />
          : null
      }

      {renderableRegions.map(([groupName, list]) => {
        const isBrush = groupName.match(/brush/i) !== null;
        const isSuggestion = groupName.match('suggested') !== null;

        return list.length > 0 ? (
          <Regions
            key={groupName}
            name={groupName}
            regions={list}
            useLayers={isBrush === false}
            suggestion={isSuggestion}
          />
        ) : <Fragment key={groupName} />;
      })}
      <Selection
        item={item}
        isPanning={state.isPanning}
      />
      <DrawingRegion item={item} />

      {item.crosshair && (
        <Crosshair
          ref={crosshairRef}
          width={isFF(FF_ZOOM_OPTIM) ? item.containerWidth : (isFF(FF_DEV_1285) ? item.stageWidth : item.stageComponentSize.width)}
          height={isFF(FF_ZOOM_OPTIM) ? item.containerHeight : (isFF(FF_DEV_1285) ? item.stageHeight : item.stageComponentSize.height)}
        />
      )}
    </>
  );
});
