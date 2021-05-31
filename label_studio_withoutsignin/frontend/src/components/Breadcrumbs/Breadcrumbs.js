import React, { useEffect, useState } from 'react';
import { useConfig } from '../../providers/ConfigProvider';
import { useBreadcrumbs } from '../../providers/RoutesProvider';
import { BemWithSpecifiContext } from '../../utils/bem';
import { absoluteURL } from '../../utils/helpers';
import { Dropdown } from '../Dropdown/Dropdown';
import { Menu } from '../Menu/Menu';
import './Breadcrumbs.styl';

const {Block, Elem} = BemWithSpecifiContext();

export const Breadcrumbs = () => {
  const config = useConfig();
  const reactBreadcrumbs = useBreadcrumbs();
  const [breadcrumbs, setBreadcrumbs] = useState(reactBreadcrumbs);

  useEffect(() => {
    if (reactBreadcrumbs.length) {
      setBreadcrumbs(reactBreadcrumbs);
    } else if (config.breadcrumbs) {
      setBreadcrumbs(config.breadcrumbs);
    }
  }, [reactBreadcrumbs, config]);

  return (
    <Block name="breadcrumbs">
      <Elem tag="ul" name="list">
        {breadcrumbs.map((item, index, list) => {
          const isLastItem = index === list.length - 1;

          const key = `item-${index}-${item.title}`;

          const href = item.href ?? item.path;

          const title = (
            <Elem tag="span" name="label" mod={{faded: index === item.length - 1}}>
              {item.title}
            </Elem>
          );

          const dropdownSubmenu = item.submenu ? (
            <Dropdown>
              <Menu>
                {item.submenu.map((sub, index) => {
                  return <Menu.Item
                    key={`${index}-${item.title}`}
                    label={sub.title}
                    icon={sub.icon}
                    href={sub.href ?? sub.path}
                    active={sub.active}
                  />;
                })}
              </Menu>
            </Dropdown>
          ) : null;

          return item.onClick ? (
            <Elem key={key} tag="li" name="item" mod={{last: isLastItem}}>
              <span onClick={item.onClick}>{title}</span>
            </Elem>
          ) : dropdownSubmenu ? (
            <Elem key={key} tag="li" component={Dropdown.Trigger} name="item" mod={{last: isLastItem}} content={dropdownSubmenu}>
              <span>{title}</span>
            </Elem>
          ) : (href && !isLastItem) ? (
            <Elem key={key} tag="li" name="item" mod={{last: isLastItem}}>
              <a href={absoluteURL(href)}>{title}</a>
            </Elem>
          ) : (
            <Elem key={key} tag="li" name="item" mod={{last: isLastItem}}>
              {title}
            </Elem>
          );
        })}
      </Elem>
    </Block>
  );
};
