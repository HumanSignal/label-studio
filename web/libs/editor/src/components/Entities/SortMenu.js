import { Menu } from 'antd';
import { observer } from 'mobx-react';
import { ThunderboltOutlined } from '@ant-design/icons';
import React from 'react';
import { LsDate } from '../../assets/icons';
import { Block, Elem } from '../../utils/bem';
import './SortMenu.styl';

export const SortMenuIcon = ({ sortKey }) => {
  switch (sortKey) {
    case 'date':
      return <LsDate />;
    case 'score':
      return <ThunderboltOutlined />;
    default:
      return null;
  }
};

export const SortMenu = observer(({ regionStore }) => {
  return (
    <Block name="sort-menu" tag={Menu} selectedKeys={[regionStore.sort]}>
      <Menu.Item key="date">
        <Elem name="option-inner"
          onClick={ev => {
            regionStore.setSort('date');
            ev.preventDefault();
            return false;
          }}
        >
          <Elem name="title">
            <Elem name="icon" tag="span"><SortMenuIcon sortKey="date" /></Elem> Date
          </Elem>
          <span>{regionStore.sort === 'date' && (regionStore.sortOrder === 'asc' ? '↓' : '↑')}</span>
        </Elem>
      </Menu.Item>
      <Menu.Item key="score">
        <Elem name="option-inner"
          onClick={ev => {
            regionStore.setSort('score');
            ev.preventDefault();
            return false;
          }}
        >
          <Elem name="title">
            <Elem name="icon" tag="span"><SortMenuIcon sortKey="score" /></Elem> Score
          </Elem>
          <span>{regionStore.sort === 'score' && (regionStore.sortOrder === 'asc' ? '↓' : '↑')}</span>
        </Elem>
      </Menu.Item>
    </Block>
  );
});
