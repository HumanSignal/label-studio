import React from 'react';
import { cn } from '../../utils/bem';
import './DescriptionList.styl';

export const DescriptionList = ({style, className, children}) => {
  return (
    <dl className={cn('dl').mix(className)} style={style}>
      {children}
    </dl>
  );
};

DescriptionList.Item = ({ retmClassName, descriptionClassName, term, descriptionStyle, termStyle, children }) => {
  return (
    <>
      <dt className={cn('dl').elem('dt').mix(retmClassName)} style={descriptionStyle}>{term}</dt>
      <dd className={cn('dl').elem('dd').mix(descriptionClassName)} style={termStyle}>{children}</dd>
    </>
  );
};
