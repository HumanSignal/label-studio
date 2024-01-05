import { FC, MouseEvent, useCallback, useContext, useMemo } from 'react';
import { IconInterpolationAdd, IconInterpolationRemove, IconKeypointAdd, IconKeypointDelete } from '../../../../assets/icons/timeline';
import { TimelineContext } from '../../Context';
import { ControlButton } from '../../Controls';
import { TimelineExtraControls } from '../../Types';

type Actions = 'keypoint_add' | 'keypoint_remove' | 'lifespan_add' | 'lifespan_remove'
type DataType = {
  frame: number,
}

export const Controls: FC<TimelineExtraControls<Actions, DataType>> = ({
  onAction,
}) => {
  const { position, regions } = useContext(TimelineContext);
  const hasSelectedRegion = regions.some(({ selected }) => selected);
  const closestKeypoint = useMemo(() => {
    const region = regions.find(r => r.selected);

    return region?.sequence.filter(({ frame }) => frame <= position).slice(-1)[0];
  }, [regions, position]);

  const canAddKeypoint = closestKeypoint?.frame !== position;
  const canAddLifespan = closestKeypoint?.enabled === false;

  const onKeypointToggle = useCallback((e: MouseEvent) => {
    if (canAddKeypoint) {
      onAction?.(e, 'keypoint_add', {
        frame: position,
      });
    } else {
      onAction?.(e, 'keypoint_remove', {
        frame: closestKeypoint!.frame,
      });
    }
  }, [onAction, canAddKeypoint, position, closestKeypoint?.frame]);

  const onLifespanToggle = useCallback((e: MouseEvent) => {
    if (canAddLifespan) {
      onAction?.(e, 'lifespan_add', {
        frame: closestKeypoint!.frame,
      });
    } else {
      onAction?.(e, 'lifespan_remove', {
        frame: closestKeypoint!.frame,
      });
    }
  }, [onAction, canAddLifespan, closestKeypoint?.frame]);

  const keypointIcon = useMemo(() => {
    if (canAddKeypoint) {
      return <IconKeypointAdd/>;
    }

    return <IconKeypointDelete/>;
  }, [canAddKeypoint, closestKeypoint]);

  const interpolationIcon = useMemo(() => {
    if (canAddLifespan) {
      return <IconInterpolationAdd/>;
    }

    return <IconInterpolationRemove/>;
  }, [closestKeypoint, canAddLifespan]);

  return (
    <>
      <ControlButton
        onClick={onKeypointToggle}
        disabled={!hasSelectedRegion}
        tooltip="Toggle Keypoint"
      >
        {keypointIcon}
      </ControlButton>

      <ControlButton
        onClick={onLifespanToggle}
        disabled={!closestKeypoint}
        tooltip="Toggle Interpolation"
      >
        {interpolationIcon}
      </ControlButton>
    </>
  );
};
