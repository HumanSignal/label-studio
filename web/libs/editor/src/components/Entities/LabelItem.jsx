import { List } from 'antd';
import { observer } from 'mobx-react';
import { Button } from '../../common/Button/Button';
import { Block, Elem } from '../../utils/bem';
import { Space } from '../../common/Space/Space';
import { LsInvisible, LsVisible } from '../../assets/icons';
import { Label } from '../Label/Label';
import React from 'react';
import { asVars } from '../../utils/styles';
import './LabelItem.styl';

export const LabelItem = observer(({ item, regions, regionStore }) => {
  const color = item.background;
  const vars = asVars({ color });

  const isHidden = Object.values(regions).reduce((acc, item) => acc && item.hidden, true);
  const count = Object.values(regions).length;

  return (
    <Block name="list-item" tag={List.Item} key={item.id} style={vars}>
      <Space spread>
        <Elem name="title">
          {!item.isNotLabel ? (
            <Label color={color} empty={item.isEmpty}>
              {item._value}
            </Label>
          ) : <>Not labeled</>}
          <Elem name="counter">
            {`${count} Region${(count === 0 || count > 1) ? 's' : ''}`}
          </Elem>
        </Elem>
        <Elem
          name="visibility"
          tag={Button}
          type="text"
          icon={isHidden ? <LsInvisible/> : <LsVisible/>}
          onClick={() => regionStore.setHiddenByLabel(!isHidden, item)}
          mod={{ hidden: isHidden }}
        />
      </Space>
    </Block>
  );
});
