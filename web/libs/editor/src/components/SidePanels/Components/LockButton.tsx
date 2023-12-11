import { observer } from 'mobx-react';
import { FC } from 'react';
import { IconLockLocked, IconLockUnlocked } from '../../../assets/icons';
import { ButtonProps } from '../../../common/Button/Button';
import { RegionControlButton } from './RegionControlButton';
import { FF_DEV_3873, isFF } from '../../../utils/feature-flags';

export const LockButton: FC<{
  item: any,
  annotation: any,
  hovered: boolean,
  locked: boolean,
  hotkey?: string,
  look?: ButtonProps['look'],
  style?: ButtonProps['style'],
  onClick: () => void,
}> = observer(({ item, annotation, hovered, locked, hotkey, look, style, onClick }) => {
  if (!item) return null;
  const isLocked = locked || item.isReadOnly() || annotation.isReadOnly();
  const isRegionReadonly = item.isReadOnly() && !locked;

  if (isFF(FF_DEV_3873)) {
    const styles = {
      ...style,
      display: item.isReadOnly() || locked ? undefined : 'none',
    };

    return (
      <RegionControlButton disabled={isRegionReadonly} onClick={onClick} hotkey={hotkey} look={look} style={styles}>
        {isLocked ? <IconLockLocked /> : <IconLockUnlocked />}
      </RegionControlButton>
    );
  }

  return (
    item &&
    (hovered || item.isReadOnly() || locked) && (
      <RegionControlButton disabled={isRegionReadonly} onClick={onClick} hotkey={hotkey} look={look} style={style}>
        {isLocked ? <IconLockLocked /> : <IconLockUnlocked />}
      </RegionControlButton>
    )
  );
});
