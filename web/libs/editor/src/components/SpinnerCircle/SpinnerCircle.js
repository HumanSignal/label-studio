import React from 'react';
import './SpinnerCircle.styl';
import { Block } from '../../utils/bem';

export const SpinnerCircle = ({ size, color, ...rest }) => {
  const customStyles = {};

  if (typeof size !== 'undefined') {
    customStyles["----spinner-size"] = `${size}px`;
  }
  if (typeof color !== 'undefined') {
    customStyles["----spinner-color"] = color;
  }
  return <Block name="circular-spinner" style={customStyles} {...rest}></Block>;
};
