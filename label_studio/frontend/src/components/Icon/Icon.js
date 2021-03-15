import React from 'react';
import { cn } from '../../utils/bem';

export const Icon = ({name, size=18, className="", data={}}) => {
  const dataAttr = Object.entries(data).reduce((res, entry) => {
    const {key, value} = entry;

    return Object.assign(res, { [`data-${key}`]: value });
  }, {});

  const iconPath = `/static/icons/${name}.svg`;

  return (
    <img
      alt={`Icon ${name}`}
      width={size}
      height={size}
      src={iconPath}
      className={cn('icon').mix(className)}
      data-name={name}
      {...dataAttr}
    />
  );
};
