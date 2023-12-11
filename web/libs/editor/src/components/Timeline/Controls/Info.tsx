import React, { FC } from 'react';
import { Block, Elem } from '../../../utils/bem';

import './Info.styl';
import { IconInfoConfig } from '../../../assets/icons/timeline';

export interface InfoProps {
  text:string;
}

export const Info: FC<InfoProps> = ({
  text,
}) => {

  return (
    <Block name="control-info">
      <IconInfoConfig />
      <Elem
        name={'tooltip'}
      >
        {text}
      </Elem>
    </Block>
  );
};
