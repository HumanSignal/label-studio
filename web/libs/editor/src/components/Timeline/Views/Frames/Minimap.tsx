import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../../../utils/bem';
import { isDefined } from '../../../../utils/utilities';
import { visualizeLifespans } from './Utils';
import './Minimap.styl';
import { TimelineContext } from '../../Context';

export const Minimap: FC<any> = () => {
  const { regions, length } = useContext(TimelineContext);
  const root = useRef<HTMLDivElement>();
  const [step, setStep] = useState(0);

  const visualization = useMemo(() => {
    return regions.map(({ id, color, sequence }) => {
      return {
        id,
        color,
        lifespans: visualizeLifespans(sequence, step),
      };
    });
  }, [step, regions]);

  useEffect(() => {
    if (isDefined(root.current) && length > 0) {
      setStep(root.current.clientWidth / length);
    }
  }, [length]);

  return (
    <Block ref={root} name="minimap">
      {visualization.slice(0, 5).map(({ id, color, lifespans }) => {
        return (
          <Elem key={id} name="region" style={{ '--color': color }}>
            {lifespans.map((connection, i) => {
              const isLast = i + 1 === lifespans.length;
              const left = connection.start * step;
              const width = (isLast && connection.enabled) ? '100%' : connection.width;

              return (
                <Elem key={`${id}${i}`} name="connection" style={{ left, width }}/>
              );
            })}
          </Elem>
        );
      })}
    </Block>
  );
};
