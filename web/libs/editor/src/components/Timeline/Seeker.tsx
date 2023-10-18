import { clamp } from 'lodash';
import { FC, ReactElement, useCallback, useRef } from 'react';
import { Block, Elem } from '../../utils/bem';
import { TimelineMinimapProps } from './Types';

import './Seeker.styl';

export interface SeekerProps {
  position: number;
  length: number;
  seekOffset: number;
  seekVisible: number;
  step: number;
  leftOffset?: number;
  minimap?: ReactElement<TimelineMinimapProps> | null;
  onIndicatorMove: (position: number) => void;
  onSeek: (position: number) => void;
}

export const Seeker: FC<SeekerProps> = ({
  position,
  length,
  seekOffset,
  seekVisible,
  onIndicatorMove,
  onSeek,
  minimap,
  step,
  ...props
}) => {
  const leftOffset = (props.leftOffset ?? 150) / step;
  const rootRef = useRef<HTMLDivElement>();
  const seekerRef = useRef<HTMLDivElement>();
  const viewRef = useRef<HTMLDivElement>();

  const showIndicator = seekVisible > 0;

  // The indicator width is set wider by 1.5, to account for the pixel sizing of the position indicator width and placement
  // to align better with the viewable timeline scroll.
  const width = `${(Math.ceil(seekVisible) - Math.floor(leftOffset) + 1.5) / length * 100}%`;
  const offsetLimit = length - (seekVisible - leftOffset);
  const windowOffset = `${Math.min(seekOffset, offsetLimit) / length * 100}%`;
  const seekerOffset = position / length * 100;

  const onIndicatorDrag = useCallback((e) => {
    const indicator = viewRef.current!;
    const dimensions = rootRef.current!.getBoundingClientRect();
    const indicatorWidth = indicator.clientWidth;

    const startDrag = e.pageX;
    const startOffset = startDrag - dimensions.left - (indicatorWidth / 2);
    const parentWidth = dimensions.width;
    const limit = parentWidth - indicatorWidth;

    const jump = clamp(Math.ceil(length * (startOffset / parentWidth)), 0, limit);

    onIndicatorMove?.(jump);

    const onMouseMove = (e: globalThis.MouseEvent) => {
      const newOffset = clamp(startOffset + (e.pageX - startDrag), 0, limit);
      const percent = newOffset / parentWidth;

      onIndicatorMove?.(Math.ceil(length * percent));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [length]);

  const onSeekerDrag = useCallback((e: globalThis.MouseEvent) => {
    const indicator = seekerRef.current!;
    const dimensions = rootRef.current!.getBoundingClientRect();
    const indicatorWidth = indicator.clientWidth;

    const startDrag = e.pageX;
    const startOffset = startDrag - dimensions.left - (indicatorWidth / 2);
    const parentWidth = dimensions.width;

    const jump = (e: globalThis.MouseEvent) => {
      const limit = parentWidth - indicator.clientWidth;
      const newOffset = clamp(startOffset + (e.pageX - startDrag), 0, limit);
      const percent = newOffset / parentWidth;
      const newPosition = Math.ceil(length * percent);

      onSeek?.(newPosition);
    };

    jump(e);

    const onMouseMove = (e: globalThis.MouseEvent) => {
      jump(e);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [length]);

  const onDrag = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.target === viewRef.current) {
      onIndicatorDrag(e);
    } else {
      onSeekerDrag(e);
    }
  }, [onIndicatorDrag, onSeekerDrag]);

  return (
    <Block name="seeker" ref={rootRef} onMouseDown={onDrag}>
      <Elem name="track"/>
      {showIndicator && (
        <Elem name="indicator" ref={viewRef} style={{ left: windowOffset, width }}/>
      )}
      <Elem name="position" ref={seekerRef} style={{ left: `${seekerOffset}%` }}/>
      <Elem name="minimap">{minimap}</Elem>
    </Block>
  );
};
