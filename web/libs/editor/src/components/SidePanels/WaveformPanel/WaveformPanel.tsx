import { IconFullscreen, IconFullscreenExit } from "@humansignal/icons";
import { observer } from "mobx-react";
import { type FC, useEffect, useRef, useState } from "react";
import { useFullscreen } from "../../../hooks/useFullscreen";
import { slots } from "../../../tags/object/Audio/float";
import { cn } from "../../../utils/bem";
import type { PanelProps } from "../PanelBase";
import "./WaveformPanel.prefix.css";

const WaveformStandAlone: FC = () => {
  const box = useRef<HTMLDivElement>(null);
  const at = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  const names = Array.from(slots.keys()).sort();

  const full = useFullscreen(
    {
      onEnterFullscreen: () => setBig(true),
      onExitFullscreen: () => setBig(false),
    },
    [],
  );

  useEffect(() => {
    const to = at.current;

    if (!to) return;
    const taken = names.map((name) => slots.get(name)!).filter(Boolean);

    for (const slot of taken) {
      to.appendChild(slot.host);
    }
    return () => {
      for (const slot of taken) {
        if (slot.host.parentElement === to) {
          slot.home.appendChild(slot.host);
        }
      }
    };
    // on a remount the new panel grabs the host before this runs, so only give back what we still hold
  }, [names.join()]);

  const toggle = () => {
    const el = box.current;

    if (!el) return;
    if (big) {
      full.exit();
    } else {
      full.enter(el);
    }
  };

  return (
    <div ref={box} className={cn("waveform-panel").mod({ full: big }).toClassName()}>
      <button
        type="button"
        title={big ? "Exit fullscreen" : "Fullscreen"}
        className={cn("waveform-panel").elem("full").toClassName()}
        onClick={toggle}
      >
        {big ? <IconFullscreenExit /> : <IconFullscreen />}
      </button>
      <div ref={at} className={cn("waveform-panel").elem("body").toClassName()} />
    </div>
  );
  // the body stays empty in JSX, the effect moves the audio hosts into it
};

export const WaveformComponent = observer(WaveformStandAlone) as FC<PanelProps>;
