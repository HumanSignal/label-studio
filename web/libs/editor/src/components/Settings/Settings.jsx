import React, { useMemo } from "react";
import { Modal, Table, Tabs } from "antd";
import { observer } from "mobx-react";

import { Hotkey } from "../../core/Hotkey";

import "./Settings.prefix.css";
import { cn } from "../../utils/bem";
import { triggerResizeEvent } from "../../utils/utilities";

import EditorSettings from "../../core/settings/editorsettings";
import * as TagSettings from "./TagSettings";
import { IconClose } from "@humansignal/icons";
import { Checkbox, Toggle } from "@humansignal/ui";
import { ff } from "@humansignal/core";

const HotkeysDescription = () => {
  const columns = [
    { title: "Shortcut", dataIndex: "combo", key: "combo" },
    { title: "Description", dataIndex: "descr", key: "descr" },
  ];

  const keyNamespaces = Hotkey.namespaces();

  const getData = (descr) =>
    Object.keys(descr)
      .filter((k) => descr[k])
      .map((k) => ({
        key: k,
        combo: k.split(",").map((keyGroup) => {
          return (
            <div className={cn("keys").elem("key-group").toClassName()} key={keyGroup}>
              {keyGroup
                .trim()
                .split("+")
                .map((k) => (
                  <kbd className={cn("keys").elem("key").toClassName()} key={k}>
                    {k}
                  </kbd>
                ))}
            </div>
          );
        }),
        descr: descr[k],
      }));

  return (
    <div className={cn("keys").toClassName()}>
      <Tabs size="small">
        {Object.entries(keyNamespaces).map(([ns, data]) => {
          if (Object.keys(data.descriptions).length === 0) {
            return null;
          }
          return (
            <Tabs.TabPane key={ns} tab={data.description ?? ns}>
              <Table columns={columns} dataSource={getData(data.descriptions)} size="small" />
            </Tabs.TabPane>
          );
        })}
      </Tabs>
    </div>
  );
};

const newUI = { newUI: true };

const editorSettingsKeys = Object.keys(EditorSettings).filter((key) => {
  const flag = EditorSettings[key].flag;
  return flag ? ff.isActive(flag) : true;
});

const enableTooltipsIndex = editorSettingsKeys.indexOf("enableTooltips");
const enableLabelTooltipsIndex = editorSettingsKeys.indexOf("enableLabelTooltips");

// swap these in the array (new UI order)
const tmp = editorSettingsKeys[enableTooltipsIndex];

editorSettingsKeys[enableTooltipsIndex] = editorSettingsKeys[enableLabelTooltipsIndex];
editorSettingsKeys[enableLabelTooltipsIndex] = tmp;

const SettingsTag = ({ children }) => {
  return <div className={cn("settings-tag").toClassName()}>{children}</div>;
};

const GeneralSettings = observer(({ store }) => {
  return (
    <div className={cn("settings").mod(newUI).toClassName()}>
      {editorSettingsKeys.map((obj, index) => {
        return (
          <label className={cn("settings").elem("field").toClassName()} key={index}>
            <>
              <div className={cn("settings__label").toClassName()}>
                <div className={cn("settings__label").elem("title").toClassName()}>
                  {EditorSettings[obj].newUI.title}
                  {EditorSettings[obj].newUI.tags?.split(",").map((tag) => (
                    <SettingsTag key={tag}>{tag}</SettingsTag>
                  ))}
                </div>
                <div className={cn("settings__label").elem("description").toClassName()}>
                  {EditorSettings[obj].newUI.description}
                </div>
              </div>
              <Toggle
                key={index}
                checked={store.settings[obj]}
                onChange={store.settings[EditorSettings[obj].onChangeEvent]}
                description={EditorSettings[obj].description}
              />
            </>
          </label>
        );
      })}
    </div>
  );
});

const LayoutSettings = observer(({ store }) => {
  return (
    <div className={cn("settings").mod(newUI).toClassName()}>
      <div className={cn("settings").elem("field").toClassName()}>
        <Checkbox
          checked={store.settings.bottomSidePanel}
          onChange={() => {
            store.settings.toggleBottomSP();
            setTimeout(triggerResizeEvent);
          }}
        >
          Move sidepanel to the bottom
        </Checkbox>
      </div>

      <div className={cn("settings").elem("field").toClassName()}>
        <Checkbox checked={store.settings.displayLabelsByDefault} onChange={store.settings.toggleSidepanelModel}>
          Display Labels by default in Results panel
        </Checkbox>
      </div>

      <div className={cn("settings").elem("field").toClassName()}>
        <Checkbox
          value="Show Annotations panel"
          defaultChecked={store.settings.showAnnotationsPanel}
          onChange={() => {
            store.settings.toggleAnnotationsPanel();
          }}
        >
          Show Annotations panel
        </Checkbox>
      </div>

      <div className={cn("settings").elem("field").toClassName()}>
        <Checkbox
          value="Show Predictions panel"
          defaultChecked={store.settings.showPredictionsPanel}
          onChange={() => {
            store.settings.togglePredictionsPanel();
          }}
        >
          Show Predictions panel
        </Checkbox>
      </div>

      {/* Saved for future use */}
      {/* <div className={cn("settings").elem("field").toClassName()}>
        <Checkbox
          value="Show image in fullsize"
          defaultChecked={store.settings.imageFullSize}
          onChange={() => {
            store.settings.toggleImageFS();
          }}
        >
          Show image in fullsize
        </Checkbox>
      </div> */}
    </div>
  );
});

const Settings = {
  General: { name: "General", component: GeneralSettings },
  Hotkeys: { name: "Hotkeys", component: HotkeysDescription },
};

const DEFAULT_ACTIVE = Object.keys(Settings)[0];

const DEFAULT_MODAL_SETTINGS = {
  name: "settings-modal",
  title: "Labeling Interface Settings",
  closeIcon: <IconClose />,
};

export default observer(({ store }) => {
  const availableSettings = useMemo(() => {
    const availableTags = Object.values(store.annotationStore.names.toJSON());
    const settingsScreens = Object.values(TagSettings);

    return availableTags.reduce((res, tagName) => {
      const tagType = store.annotationStore.names.get(tagName).type;
      const settings = settingsScreens.find(({ tagName }) => tagName.toLowerCase() === tagType.toLowerCase());

      if (settings) res.push(settings);

      return res;
    }, []);
  }, []);

  return (
    <Modal
      className={cn(DEFAULT_MODAL_SETTINGS.name).toClassName()}
      open={store.showingSettings}
      onCancel={store.toggleSettings}
      footer=""
      title={DEFAULT_MODAL_SETTINGS.title}
      closeIcon={DEFAULT_MODAL_SETTINGS.closeIcon}
      bodyStyle={DEFAULT_MODAL_SETTINGS.bodyStyle}
    >
      <Tabs defaultActiveKey={DEFAULT_ACTIVE}>
        {Object.entries(Settings).map(([key, { name, component }]) => (
          <Tabs.TabPane tab={name} key={key}>
            {React.createElement(component, { store })}
          </Tabs.TabPane>
        ))}
        {availableSettings.map((Page) => (
          <Tabs.TabPane tab={Page.title} key={Page.tagName}>
            <Page store={store} />
          </Tabs.TabPane>
        ))}
      </Tabs>
    </Modal>
  );
});
