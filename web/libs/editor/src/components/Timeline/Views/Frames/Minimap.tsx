import { useResizeObserver } from "@humansignal/core/hooks/useResizeObserver";
import { type FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../../utils/bem";
import { isDefined } from "../../../../utils/utilities";
import { TimelineContext } from "../../Context";
import { visualizeLifespans } from "./Utils";
import "./Minimap.scss";

export const Minimap: FC<any> = () => {
  const { regions, length } = useContext(TimelineContext);
  const root = useRef<HTMLDivElement>();
  const [step, setStep] = useState(0);

  const visualization = useMemo(() => {
    return regions.map(({ id, color, sequence, locked }) => {
      return {
        id,
        color,
        lifespans: visualizeLifespans(sequence, step, locked),
      };
    });
  }, [step, regions]);

  const { width: rootWidth = 0 } = useResizeObserver(root.current || []);
  useEffect(() => {
    if (isDefined(root.current) && length > 0) {
      setStep(rootWidth / length);
    }
  }, [length, rootWidth]);

  return (
    <div ref={root as any} className={cn("minimap").toClassName()}>
      {visualization.slice(0, 5).map(({ id, color, lifespans }) => {
        return (
          <div key={id} className={cn("minimap").elem("region").toClassName()} style={{ "--color": color } as any}>
            {lifespans.map((connection, i) => {
              const isLast = i + 1 === lifespans.length;
              const left = connection.start * step;
              const width = isLast && connection.enabled ? "100%" : connection.width;

              return (
                <div
                  key={`${id}${i}`}
                  className={cn("minimap").elem("connection").toClassName()}
                  style={{ left, width }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
