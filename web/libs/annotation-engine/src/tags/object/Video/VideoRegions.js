import chroma from 'chroma-js';
import { clamp } from 'lodash';
import { observer } from 'mobx-react';
import { getParentOfType } from 'mobx-state-tree';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layer, Rect, Stage, Transformer } from 'react-konva';
import Constants from '../../../core/Constants';
import { Annotation } from '../../../stores/Annotation/Annotation';
import { fixMobxObserve } from '../../../utils/utilities';
import { Rectangle } from './Rectangle';
import { createBoundingBoxGetter, createOnDragMoveHandler } from './TransformTools';

export const MIN_SIZE = 5;

const SelectionRect = (props) => {
  return (
    <>
      <Rect
        {...props}
        strokeWidth={2}
        stroke="#fff"
      />
      <Rect
        {...props}
        fill={chroma('#0099FF').alpha(0.1).css()}
        strokeWidth={2}
        stroke="#0099FF"
        dash={[2, 2]}
      />
    </>
  );
};

const VideoRegionsPure = ({
  item,
  regions,
  width,
  height,
  zoom,
  workingArea: videoDimensions,
  locked = false,
  allowRegionsOutsideWorkingArea = true,
  pan = { x: 0, y: 0 },
  stageRef,
}) => {
  const [newRegion, setNewRegion] = useState();
  const [isDrawing, setDrawingMode] = useState(false);

  const selected = regions.filter((reg) => {
    return (reg.selected || reg.inSelection) && !reg.hidden && !reg.isReadOnly() && reg.isInLifespan(item.frame);
  });
  const listenToEvents = !locked;

  // if region is not in lifespan, it's not rendered,
  // so we observe all the sequences to rerender transformer
  regions.map(reg => fixMobxObserve(reg.sequence));

  const workinAreaCoordinates = useMemo(() => {
    const resultWidth = videoDimensions.width * zoom;
    const resultHeight = videoDimensions.height * zoom;
    const overshotX = Math.abs(pan.x) >= Math.abs((width - resultWidth) / 2);
    const overshotY = Math.abs(pan.y) >= Math.abs((height - resultHeight) / 2);
    const panXDirection = pan.x > 0 ? 1 : -1;
    const panYDirection = pan.y > 0 ? 1 : -1;
    const overshotXAmmount = (Math.abs(pan.x) - Math.abs((width - resultWidth) / 2)) * panXDirection;
    const overshotYAmmount = (Math.abs(pan.y) - Math.abs((height - resultHeight) / 2)) * panYDirection;
    const edgeZoomOffestX = overshotX ? overshotXAmmount : 0;
    const edgeZoomOffestY = overshotY ? overshotYAmmount : 0;
    const offsetLeft = ((width - resultWidth) / 2) + pan.x - edgeZoomOffestX;
    const offsetTop = ((height - resultHeight) / 2) + pan.y - edgeZoomOffestY;

    return {
      width: resultWidth,
      height: resultHeight,
      x: offsetLeft,
      y: offsetTop,
      scale: zoom,
      realWidth: videoDimensions.width,
      realHeight: videoDimensions.height,
    };
  }, [pan.x, pan.y, zoom, videoDimensions, width, height]);

  const layerProps = useMemo(() => ({
    width: workinAreaCoordinates.width,
    height: workinAreaCoordinates.height,
    scaleX: zoom,
    scaleY: zoom,
    position: {
      x: workinAreaCoordinates.x,
      y: workinAreaCoordinates.y,
    },
  }), [workinAreaCoordinates, zoom]);

  const normalizeMouseOffsets = useCallback((x, y) => {
    const { x: offsetLeft, y: offsetTop } = workinAreaCoordinates;

    return {
      x: (x - offsetLeft) / zoom,
      y: (y - offsetTop) / zoom,
    };
  }, [workinAreaCoordinates, zoom]);

  useEffect(() => {
    if (!isDrawing && newRegion) {
      const { width: waWidth, height: waHeight } = videoDimensions;
      let x = (newRegion.x / waWidth) * 100;
      let y = (newRegion.y / waHeight) * 100;
      let width = (newRegion.width / waWidth) * 100;
      let height = (newRegion.height / waHeight) * 100;

      // deal with negative sizes
      if (width < 0) {
        width *= -1;
        x -= width;
      }
      if (height < 0) {
        height *= -1;
        y -= height;
      }

      const fixedRegion = { x, y, width, height };

      item.addRegion(fixedRegion);
      setNewRegion(null);
    }
  }, [isDrawing, workinAreaCoordinates, videoDimensions]);

  const inBounds = (x, y) => {
    if (allowRegionsOutsideWorkingArea) return true;

    return x > 0 &&
           y > 0 &&
           x < workinAreaCoordinates.realWidth &&
           y < workinAreaCoordinates.realHeight;
  };

  const limitCoordinates = ({ x, y }) => {
    if (allowRegionsOutsideWorkingArea) return { x, y };

    return {
      x: clamp(x, 0, workinAreaCoordinates.realWidth),
      y: clamp(y, 0, workinAreaCoordinates.realHeight),
    };
  };

  const handleMouseDown = e => {
    if (e.target !== stageRef.current || item.annotation?.isReadOnly()) return;

    const { x, y } = limitCoordinates(normalizeMouseOffsets(e.evt.offsetX, e.evt.offsetY));

    const isInBounds = inBounds(x, y);

    if (isInBounds) {
      item.annotation.unselectAreas();
      setNewRegion({ x, y, width: 0, height: 0 });
      setDrawingMode(true);
    }
  };

  const handleMouseMove = e => {
    if (!isDrawing || item.annotation?.isReadOnly()) return false;

    const { x, y } = limitCoordinates(normalizeMouseOffsets(e.evt.offsetX, e.evt.offsetY));

    setNewRegion(region => ({
      ...region,
      width: x - region.x,
      height: y - region.y,
    }));
  };

  const handleMouseUp = e => {
    if (!isDrawing || item.annotation?.isReadOnly()) return false;

    const { x, y } = limitCoordinates(normalizeMouseOffsets(e.evt.offsetX, e.evt.offsetY));

    if (Math.abs(newRegion.x - x) < MIN_SIZE && Math.abs(newRegion.y - y) < MIN_SIZE) {
      setNewRegion(null);
    } else {
      setNewRegion(region => ({ ...region, width: x - region.x, height: y - region.y }));
    }
    setDrawingMode(false);
  };

  const initTransform = tr => {
    if (!tr) return;

    const stage = tr.getStage();
    // @todo not an obvious way to not render transformer for hidden regions
    // @todo could it be rewritten to usual react way?
    const shapes = selected.map(shape => stage.findOne('#' + shape.id)).filter(Boolean);

    tr.nodes(shapes);
    tr.getLayer().batchDraw();
  };

  const eventHandlers = listenToEvents ? {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
  } : {};

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ position: 'absolute', zIndex: 1 }}
      listening={listenToEvents}
      {...eventHandlers}
    >
      <Layer {...layerProps}>
        <RegionsLayer
          regions={regions}
          item={item}
          layerProps={layerProps}
          locked={locked}
          isDrawing={isDrawing}
          workinAreaCoordinates={workinAreaCoordinates}
          onDragMove={createOnDragMoveHandler(workinAreaCoordinates, !allowRegionsOutsideWorkingArea)}
          stageRef={stageRef}
        />
      </Layer>
      {!item.annotation?.isReadOnly() && isDrawing ? (
        <Layer {...layerProps}>
          <SelectionRect {...newRegion}/>
        </Layer>
      ): null}
      {!item.annotation?.isReadOnly() && selected?.length > 0 ? (
        <Layer>
          <Transformer
            ref={initTransform}
            keepRatio={false}
            ignoreStroke
            flipEnabled={false}
            boundBoxFunc={createBoundingBoxGetter(workinAreaCoordinates, !allowRegionsOutsideWorkingArea)}
            onDragMove={createOnDragMoveHandler(workinAreaCoordinates, !allowRegionsOutsideWorkingArea)}
          />
        </Layer>
      ): null}
    </Stage>
  );
};

const RegionsLayer = observer(({
  regions,
  item,
  locked,
  isDrawing,
  workinAreaCoordinates,
  stageRef,
  onDragMove,
}) => {
  return (
    <>
      {regions.map(reg => (
        <Shape
          id={reg.id}
          key={reg.id}
          reg={reg}
          frame={item.frame}
          workingArea={workinAreaCoordinates}
          draggable={!reg.isReadOnly() && !isDrawing && !locked}
          selected={reg.selected || reg.inSelection}
          listening={!reg.locked && !reg.hidden}
          stageRef={stageRef}
          onDragMove={onDragMove}
        />
      ))}
    </>
  );
});

const Shape = observer(({
  reg,
  frame,
  stageRef,
  ...props
}) => {
  const box = reg.getShape(frame);

  return reg.isInLifespan(frame) && box && (
    <Rectangle
      reg={reg}
      box={box}
      frame={frame}
      onClick={(e) => {
        const annotation = getParentOfType(reg, Annotation);

        if (annotation && annotation.relationMode) {
          stageRef.current.container().style.cursor = Constants.DEFAULT_CURSOR;
        }

        reg.setHighlight(false);
        reg.onClickRegion(e);
      }}
      {...props}
    />
  );
});

export const VideoRegions = observer(VideoRegionsPure);
