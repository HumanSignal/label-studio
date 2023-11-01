import { KonvaEventObject } from 'konva/lib/Node';
import { observer } from 'mobx-react';
import { FC, useMemo } from 'react';
import { Group, Rect } from 'react-konva';
import { useRegionStyles } from '../../../hooks/useRegionColor';
import { getNodeAbsoluteDimensions, normalizeNodeDimentions } from './tools';
import { WorkingArea } from './types';
import { LabelOnVideoBbox } from '../../../components/ImageView/LabelOnRegion';

type RectPropsExtend = typeof Rect;

interface RectProps extends RectPropsExtend {
  reg: any;
  frame: number;
  selected: boolean;
  draggable: boolean;
  listening: boolean;
  box: { x: number, y: number, width: number, height: number, rotation: number };
  workingArea: WorkingArea;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
}

const RectanglePure: FC<RectProps> = ({
  reg,
  box,
  frame,
  workingArea,
  selected,
  draggable,
  listening,
  onDragMove,
  ...rest
}) => {
  const style = useRegionStyles(reg, { includeFill: true });

  const { realWidth: waWidth, realHeight: waHeight, scale: waScale } = workingArea;

  const newBox = useMemo(()=>({
    x: box.x * waWidth / 100,
    y: box.y * waHeight / 100,
    width: box.width * waWidth / 100,
    height: box.height * waHeight / 100,
    rotation: box.rotation,
  }), [box, waWidth, waHeight]);

  const onDimensionUpdate = (e: KonvaEventObject<Event>) => {
    const node = e.target;

    if (e.type === 'dragmove') onDragMove(e as KonvaEventObject<DragEvent>);

    reg.updateShape(getNodeAbsoluteDimensions(node, workingArea), frame);
  };

  const onTransform = (e: KonvaEventObject<Event>) => {
    normalizeNodeDimentions(e.target, 'rect');
  };

  return (
    <Group>
      <LabelOnVideoBbox
        reg={reg}
        box={newBox}
        scale={waScale}
        color={style.strokeColor}
        strokeWidth={style.strokeWidth}
        adjacent
      />
      <Rect
        {...newBox}
        fill={style.fillColor ?? '#fff'}
        stroke={style.strokeColor}
        strokeScaleEnabled={false}
        selected={selected}
        draggable={draggable}
        listening={listening}
        opacity={reg.hidden ? 0 : 1}
        onTransform={onTransform}
        onTransformEnd={onDimensionUpdate}
        onDragMove={onDimensionUpdate}
        onDragEnd={onDimensionUpdate}
        {...rest}
      />
    </Group>
  );
};

export const Rectangle = observer(RectanglePure);
