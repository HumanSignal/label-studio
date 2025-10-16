import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";
import { useContext, useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import { Hotkey } from "../../core/Hotkey";
import { ToolbarContext } from "./ToolbarContext";

const hotkeys = Hotkey("SegmentationToolbar", "Segmentation Tools");

const keysDictionary = {
  plus: "+",
  minus: "-",
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
    const sc = hotkeys.lookupKey(shortcut);

    if (!isDefined(sc)) return null;

    const combos = sc.split(",").map((s) => s.trim());

    return (
      <div className={cn("tool").elem("shortcut").toClassName()}>
        {combos.map((combo, index) => {
          const keys = combo.split("+");

          return (
            <Fragment key={`${keys.join("-")}-${index}`}>
              {keys.map((key) => {
                return (
                  <kbd className={cn("tool").elem("key").toClassName()} key={key}>
                    {keysDictionary[key] ?? key}
                  </kbd>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    );
  }, [shortcut]);

  useEffect(() => {
    const removeShortcut = () => {
      if (currentShortcut && hotkeys.hasKeyByName(currentShortcut)) {
        hotkeys.removeNamed(currentShortcut);
      }
    };

    removeShortcut();
    currentShortcut = shortcut;

    if (shortcut && !hotkeys.hasKeyByName(shortcut)) {
      hotkeys.addNamed(shortcut, () => {
        if (!tool?.disabled && !tool?.annotation?.isDrawing) {
          if (tool?.unselectRegionOnToolChange) {
            tool.annotation.unselectAreas();
          }
          onClick?.();
        }
      });
    }

    return () => {
      removeShortcut();
    };
  }, [shortcut, tool?.annotation]);

  useEffect(() => {
    const removeShortcuts = () => {
      Object.keys(extraShortcuts).forEach((key) => {
        if (hotkeys.hasKeyByName(key)) hotkeys.removeNamed(key);
      });
    };

    const addShortcuts = () => {
      Object.entries(extraShortcuts).forEach(([key, [label, fn]]) => {
        if (!hotkeys.hasKeyByName(key)) hotkeys.overwriteNamed(key, fn);
      });
    };

    if (active) {
      addShortcuts();
    }

    return removeShortcuts;
  }, [extraShortcuts, active]);

  const extraContent = useMemo(() => {
    return smart && extra ? <div className={cn("tool").elem("extra").toClassName()}>{extra}</div> : null;
  }, [smart, extra]);

  const showControls = dynamic === false && controls?.length && (active || (controlsOnHover && hovered));
  const isAnnotationDrawing = tool?.annotation?.isDrawing;
  const isDisabled = disabled || isAnnotationDrawing;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn("tool")
        .mod({
          active,
          disabled: isDisabled,
          alignment,
          expanded: expanded && !dynamic,
          smart: dynamic || smart,
        })
        .toClassName()}
      onClick={(e) => {
        if (!disabled && !isAnnotationDrawing) {
          e.preventDefault();
          if (tool?.unselectRegionOnToolChange) {
            tool?.annotation?.unselectAreas?.();
          }
          onClick?.(e);
        }
      }}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <div className={cn("tool").elem("icon").toClassName()}>{icon}</div>
      {dynamic === false &&
        controlsOnHover === false &&
        (expanded ? (
          <>
            <div className={cn("tool").elem("label").toClassName()}>
              {extraContent}
              {label}
              {shortcutView}
            </div>
          </>
        ) : (
          (isDefined(label) || isDefined(shortcutView)) &&
          !showControls && (
            <div
              className={cn("tool")
                .elem("tooltip")
                .mod({ controlled: !!(smart && extra) })
                .toClassName()}
            >
              <div className={cn("tool").elem("tooltip-body").toClassName()}>
                {extraContent}
                {label}
                {shortcutView}
              </div>
            </div>
          )
        ))}
      {showControls && (
        <div className={cn("tool").elem("controls").toClassName()} onClickCapture={(e) => e.stopPropagation()}>
          <div className={cn("tool").elem("controls-body").toClassName()}>{controls}</div>
        </div>
      )}
    </button>
  );
};
