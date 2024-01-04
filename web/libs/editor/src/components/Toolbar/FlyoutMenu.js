import { Block, Elem } from '../../utils/bem';
import { Fragment, useEffect, useState } from 'react';
import { Hotkey } from '../../core/Hotkey';

const hotkeys = Hotkey(
  'SegmentationToolbar',
  'Segmentation Tools',
);

const keysDictionary = {
  plus: '+',
  minus: '-',
};

const shortcutView = (shortcut) => {
  if (!shortcut) return null;

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
};

export const FlyoutMenu = ({
  items,
  icon,
}) => {
  const [isClicked, setClicked] = useState(false);

  useEffect(() => {
    const removeShortcuts = () => {
      items.forEach(menuItem => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && hotkeys.hasKey(currentShortcut)) {
          hotkeys.removeKey(currentShortcut);
        }
      });
    };
    const addShortcuts = () => {
      items.forEach(menuItem => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && !hotkeys.hasKey(currentShortcut)) {
          hotkeys.addKey(currentShortcut, () => {
            menuItem?.onClick?.();
            setClicked(false);
          }, menuItem.label);
        }
      });
    };

    removeShortcuts();
    addShortcuts();

    return () => {
      removeShortcuts();
    };
  }, [items]);

  useEffect(() => {
    const windowClickHandler = () => {
      if (isClicked) {
        setClicked(false);
      }
    };

    window.addEventListener('click', windowClickHandler);
    return () => {
      window.removeEventListener('click', windowClickHandler);
    };
  });

  return (
    <Block name="flyoutmenu" tag="div"
      className={`${isClicked ? 'hovered' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setClicked(!isClicked);
      }}
    >
      <Elem name="icon" className={`${isClicked ? 'isClicked' : ''}`} title="Zoom presets (click to see options)">
        {icon}
      </Elem>
      <Block name="tooltips" 
        tag="div">
        {items.map((childItem, index) => (
          <Elem name="tooltip" 
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              childItem?.onClick?.();
              setClicked(false);
            }}
          >
            <Elem name="tooltip-body">
              <Elem name="label">{childItem.label}</Elem>
              {shortcutView(childItem.shortcut)}
            </Elem>
          </Elem>
        ))}  
      </Block>
    </Block>
  );
};
