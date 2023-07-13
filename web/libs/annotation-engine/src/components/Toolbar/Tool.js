import { Block, Elem } from '../../utils/bem';
import { isDefined } from '../../utils/utilities';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Fragment } from 'react';
import { Hotkey } from '../../core/Hotkey';
import { ToolbarContext } from './ToolbarContext';

const hotkeys = Hotkey(
  'SegmentationToolbar',
  'Segmentation Tools',
);

const keysDictionary = {
  plus: '+',
  minus: '-',
};

export const Tool = ({
  active = false,
  disabled = false,
  smart = false,
  extra = null,
  tool = null,
  controlsOnHover = false,
  extraShortcuts = {},
  ariaLabel,
  controls,
  icon,
  label,
  shortcut,
  onClick,
}) => {
  let currentShortcut = shortcut;
  const dynamic = tool?.dynamic ?? false;
  const { expanded, alignment } = useContext(ToolbarContext);
  const [hovered, setHovered] = useState(false);

  const shortcutView = useMemo(() => {
    if (!isDefined(shortcut)) return null;

    const combos = shortcut.split(',').map(s => s.trim());

    return (
      <Elem name="shortcut">
        {combos.map((combo, index) => {
          const keys = combo.split('+');

          return (
            <Fragment key={`${keys.join('-')}-${index}`}>
              {keys.map(key => {
                return (
                  <Elem name="key" tag="kbd" key={key}>{keysDictionary[key] ?? key}</Elem>
                );
              })}
            </Fragment>
          );
        })}
      </Elem>
    );
  }, [shortcut]);

  useEffect(() => {
    const removeShortcut = () => {
      if (currentShortcut && hotkeys.hasKey(currentShortcut)) {
        hotkeys.removeKey(currentShortcut);
      }
    };

    removeShortcut();
    currentShortcut = shortcut;
    if (shortcut && !hotkeys.hasKey(shortcut)) {
      hotkeys.addKey(shortcut, () => {
        if(!tool?.disabled && !tool?.annotation?.isDrawing) {
          if (tool?.unselectRegionOnToolChange){
            tool.annotation.unselectAreas();
          }
          onClick?.();
        }
      }, label);
    }

    return () => {
      removeShortcut();
    };
  }, [shortcut, tool?.annotation]);

  useEffect(() => {
    const removeShortcuts = () => {
      Object.keys(extraShortcuts).forEach((key) => {
        if (hotkeys.hasKey(key)) hotkeys.removeKey(key);
      });
    };

    const addShortcuts = () => {
      Object.entries(extraShortcuts).forEach(([key, [label, fn]]) => {
        if (!hotkeys.hasKey(key)) hotkeys.overwriteKey(key, fn, label);
      });
    };

    if (active) {
      addShortcuts();
    }

    return removeShortcuts;
  }, [extraShortcuts, active]);

  const extraContent = useMemo(() => {
    return smart && extra ? (
      <Elem name="extra">{extra}</Elem>
    ) : null;
  }, [smart, extra]);

  const showControls = dynamic === false && controls?.length && (active || (controlsOnHover && hovered));
  const isAnnotationDrawing = tool?.annotation?.isDrawing;
  const isDisabled = disabled || isAnnotationDrawing;

  return (
    <Block name="tool" tag="button" aria-label={ariaLabel} mod={{
      active,
      disabled: isDisabled,
      alignment,
      expanded: expanded && !dynamic,
      smart: dynamic || smart,
    }} onClick={(e) => {
      if(!disabled && !isAnnotationDrawing) {
        e.preventDefault();
        if(tool?.unselectRegionOnToolChange) {
          tool?.annotation?.unselectAreas?.();
        }
        onClick?.(e);
      }
    }} onMouseEnter={() => {
      setHovered(true);
    }} onMouseLeave={() => {
      setHovered(false);
    }}>
      <Elem name="icon">
        {icon}
      </Elem>
      {dynamic === false && controlsOnHover === false &&  (
        expanded ? (
          <>
            <Elem name="label">
              {extraContent}
              {label}
              {shortcutView}
            </Elem>
          </>
        ) : (isDefined(label) || isDefined(shortcutView)) && !showControls && (
          <Elem name="tooltip" mod={{ controlled: !!(smart && extra) }}>
            <Elem name="tooltip-body">
              {extraContent}
              {label}
              {shortcutView}
            </Elem>
          </Elem>
        )
      )}
      {showControls && (
        <Elem name="controls" onClickCapture={e => e.stopPropagation()}>
          <Elem name="controls-body">
            {controls}
          </Elem>
        </Elem>
      )}
    </Block>
  );
};
