import React from 'react';
import { inject, observer } from 'mobx-react';

import TextNode from '../TextNode/TextNode';
import Utils from '../../utils';

const HtxTextNodeView = ({ store, range, id, highlightStyle, style, charIndex, children, overlap }) => {
  const getStyle = range => (range ? highlightStyle : style);
  const getRangeKey = () => `${id}-${range.start}-${charIndex}`;
  const getNormalKey = () => `${id}-${charIndex}`;
  const getKey = range => (range ? getRangeKey() : getNormalKey());

  let wrapper = (
    <span data-position={charIndex} key={getKey(range)} style={getStyle(range)}>
      {children}
    </span>
  );

  if (overlap && overlap.length) {
    let bg;

    if (range.states) {
      range.states.forEach(i => {
        bg = Utils.Colors.convertToRGBA(i.getSelectedColor(), 0.3);
      });
    }

    store.annotationStore.selected.regionStore.regions.forEach(i => {
      if (i.selected) {
        overlap.forEach(overlapItem => {
          if (overlapItem === i.id) {
            bg = '#ff4d4f';
          }
        });
      }

      if (i.highlighted && overlap.includes(i.id)) {
        bg = '#ff4d4f';
      }
    });

    wrapper = overlap.reduceRight((value, key) => {
      return (
        <TextNode
          style={{ background: bg, padding: '2px 0' }}
          position={charIndex}
          overlap={key}
          keyNode={getKey(range)}
        >
          {value}
        </TextNode>
      );
    }, children);
  }

  return wrapper;
};

const HtxTextNode = inject('store')(observer(HtxTextNodeView));

export { HtxTextNode };
