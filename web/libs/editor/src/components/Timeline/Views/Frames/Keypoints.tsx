import chroma from "chroma-js";
import { type FC, memo, type MouseEvent, useCallback, useContext, useMemo } from "react";
import { cn } from "../../../../utils/bem";
import { clamp } from "../../../../utils/utilities";
import { TimelineContext } from "../../Context";
import type { TimelineRegion } from "../../Types";
import "./Keypoints.scss";
import { type Lifespan, visualizeLifespans } from "./Utils";

export interface KeypointsProps {
  idx?: number;
  region: TimelineRegion;
  startOffset: number;
  renderable: boolean;
  onSelectRegion?: (e: MouseEvent<HTMLDivElement>, id: string, select?: boolean) => void;
}

export const Keypoints: FC<KeypointsProps> = ({ idx, region, startOffset, renderable, onSelectRegion }) => {
  const { step, seekOffset, visibleWidth, length } = useContext(TimelineContext);
  const { label, color, visible, sequence, selected, timeline, locked } = region;

  const extraSteps = useMemo(() => {
    return Math.round(visibleWidth / 2);
  }, [visibleWidth]);

  const minVisibleKeypointPosition = useMemo(() => {
    return clamp(seekOffset - extraSteps, 0, length);
  }, [seekOffset, extraSteps, length]);

  const maxVisibleKeypointPosition = useMemo(() => {
    return clamp(seekOffset + visibleWidth + extraSteps, 0, length);
  }, [seekOffset, visibleWidth, extraSteps, length]);

  const firstPoint = sequence[0];
  const start = firstPoint ? firstPoint.frame - 1 : 0;
  const offset = firstPoint ? start * step : startOffset;

  const styles = useMemo(
    () => ({
      "--offset": `${startOffset}px`,
      "--color": color,
      "--point-color": chroma(color).alpha(1).css(),
      "--lifespan-color": chroma(color)
        .alpha(visible ? 0.4 : 1)
        .css(),
    }),
    [startOffset, color, visible],
  );

  const lifespans = useMemo(() => {
    if (!renderable) return [];

    return visualizeLifespans(sequence, step, locked).map((span) => {
      span.points = span.points.filter(({ frame }) => {
        return frame >= minVisibleKeypointPosition && frame <= maxVisibleKeypointPosition;
      });

      return span;
    });
  }, [sequence, start, step, renderable, minVisibleKeypointPosition, maxVisibleKeypointPosition, locked]);

  const onSelectRegionHandler = useCallback(
    (e: MouseEvent<HTMLDivElement>, select?: boolean) => {
      e.stopPropagation();
      onSelectRegion?.(e, region.id, select);
    },
    [region.id, onSelectRegion],
  );

  // will work only for TimelineRegions; sequence for them is 2 or even 1 point (1 for instants)
  const range = timeline ? sequence.map((s) => s.frame) : [];

  return (
    <div
      className={cn("keypoints").mod({ selected, timeline }).toClassName()}
      style={styles as any}
      data-id={region.id}
      data-start={range[0]}
      data-end={range[1]}
      data-locked={locked || undefined}
    >
      <div className={cn("keypoints").elem("label").toClassName()} onClick={onSelectRegionHandler}>
        <div className={cn("keypoints").elem("name").toClassName()}>{label}</div>
        <div className={cn("keypoints").elem("data").toClassName()}>
          <div className={cn("keypoints").elem("data-item").mod({ faded: true }).toClassName()}>{idx}</div>
        </div>
      </div>
      <div
        className={cn("keypoints").elem("keypoints").toClassName()}
        onClick={(e: any) => onSelectRegionHandler(e, true)}
      >
        <LifespansList lifespans={lifespans} step={step} visible={visible} offset={offset} />
      </div>
    </div>
  );
};

interface LifespansListProps {
  lifespans: Lifespan[];
  step: number;
  offset: number;
  visible: boolean;
}

const LifespansList: FC<LifespansListProps> = ({ lifespans, step, offset, visible }) => {
  return (
    <>
      {lifespans.map((lifespan, i) => {
        const isLast = i + 1 === lifespans.length;
        const { points, ...data } = lifespan;

        return (
          <LifespanItem
            key={`${i}-${points.length}-${isLast}-${visible}`}
            mainOffset={offset}
            step={step}
            isLast={isLast}
            visible={visible}
            points={points.map(({ frame }) => frame)}
            {...data}
          />
        );
      })}
    </>
  );
};

interface LifespanItemProps {
  mainOffset: number;
  width: string | number;
  step: number;
  start: number;
  offset: number;
  enabled: boolean;
  visible: boolean;
  isLast: boolean;
  points: number[];
  locked?: boolean;
}

const LifespanItem: FC<LifespanItemProps> = memo(
  ({ mainOffset, width, start, step, offset, enabled, visible, isLast, points, locked }) => {
    const left = mainOffset + offset + step / 2;
    const right = isLast && enabled ? 0 : "auto";
    const finalWidth = isLast && enabled ? "auto" : width;
    const style = useMemo(() => {
      return { left, width: finalWidth, right };
    }, [left, right, finalWidth]);

    return (
      <div
        className={cn("keypoints").elem("lifespan").mod({ hidden: !visible, instant: !width }).toClassName()}
        style={style}
      >
        {points.map((frame, i) => {
          const left = (frame - start) * step;

          return (
            <div
              key={i}
              className={cn("keypoints").elem("point").mod({ last: !!left, locked }).toClassName()}
              style={{ left }}
            />
          );
        })}
      </div>
    );
  },
);
