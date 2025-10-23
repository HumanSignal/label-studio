import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";
import { Fragment, useEffect, useState } from "react";
import { Hotkey } from "../../core/Hotkey";

const hotkeys = Hotkey("SegmentationToolbar", "Segmentation Tools");

const keysDictionary = {
  plus: "+",
  minus: "-",
};

const shortcutView = (shortcut) => {
  const sc = hotkeys.lookupKey(shortcut);

  if (!isDefined(sc)) return null;

  const combos = sc.split(",").map((s) => s.trim());

  return (
    <div className={cn("flyoutmenu").elem("shortcut").toClassName()}>
      {combos.map((combo, index) => {
        const keys = combo.split("+");

        return (
          <Fragment key={`${keys.join("-")}-${index}`}>
            {keys.map((key) => {
              return (
                <kbd className={cn("flyoutmenu").elem("key").toClassName()} key={key}>
                  {keysDictionary[key] ?? key}
                </kbd>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
};

export const FlyoutMenu = ({ items, icon }) => {
  const [isClicked, setClicked] = useState(false);

  useEffect(() => {
    const removeShortcuts = () => {
      items.forEach((menuItem) => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && hotkeys.hasKeyByName(currentShortcut)) {
          hotkeys.removeNamed(currentShortcut);
        }
      });
    };
    const addShortcuts = () => {
      items.forEach((menuItem) => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && !hotkeys.hasKeyByName(currentShortcut)) {
          hotkeys.addNamed(currentShortcut, () => {
            console.log("clicked");
            menuItem?.onClick?.();
            setClicked(false);
          });
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

    window.addEventListener("click", windowClickHandler);
    return () => {
      window.removeEventListener("click", windowClickHandler);
    };
  });

  return (
    <div
      className={cn("flyoutmenu")
        .mix(isClicked ? "hovered" : "")
        .toClassName()}
      onClick={(e) => {
        e.stopPropagation();
        setClicked(!isClicked);
      }}
    >
      <div
        className={cn("flyoutmenu")
          .elem("icon")
          .mix(isClicked ? "isClicked" : "")
          .toClassName()}
        title="Zoom presets (click to see options)"
      >
        {icon}
      </div>
      <div className={cn("tooltips").toClassName()}>
        {items.map((childItem, index) => (
          <div
            className={cn("tooltips").elem("tooltip").toClassName()}
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              childItem?.onClick?.();
              setClicked(false);
            }}
          >
            <div className={cn("tooltips").elem("tooltip-body").toClassName()}>
              <div className={cn("tooltips").elem("label").toClassName()}>{childItem.label}</div>
              {shortcutView(childItem.shortcut)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
