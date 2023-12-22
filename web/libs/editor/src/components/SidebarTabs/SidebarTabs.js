import { observer } from 'mobx-react';
import React, { createContext, useState } from 'react';
import { Children } from 'react';
import { Block, Elem } from '../../utils/bem';
import './SidebarTabs.styl';

const SidebarContext = createContext();

export const SidebarTabs = observer(({ active, children }) => {
  const [selected, setSelected] = useState(active);
  const tabs = Children.toArray(children);

  return (
    <SidebarContext.Provider value={{ selected }}>
      <Block name="sidebar-tabs">
        {tabs.length > 1 && (
          <Elem name="toggle">
            {tabs.map(tab => (
              <Elem
                name="tab"
                key={tab.props.name}
                mod={{ active: tab.props.name === selected }}
                onClick={() => setSelected(tab.props.name)}
              >
                {tab.props.title}
              </Elem>
            ))}
          </Elem>
        )}

        <Elem name="content">{tabs.find(tab => tab.props.name === selected)}</Elem>
      </Block>
    </SidebarContext.Provider>
  );
});

export const SidebarPage = ({ children }) => {
  return children;
};

export const SidebarContent = ({ children }) => {
  return <Block name="sidebar-content">{children}</Block>;
};
