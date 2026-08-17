import React, { useMemo } from "react";
import { Modal, Table, Tabs } from "antd";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";

import { Hotkey, translateHotkeyDescription } from "../../core/Hotkey";

import "./Settings.prefix.css";
import { cn } from "../../utils/bem";

import EditorSettings from "../../core/settings/editorsettings";
import * as TagSettings from "./TagSettings";
import { IconClose } from "@humansignal/icons";
import { ModalWindow, Toggle, Typography } from "@humansignal/ui";
import { ff, isAnnotatorRole } from "@humansignal/core";
import { getProjectHotkeysSettingsPath, getProjectIdFromPathname } from "@humansignal/core/lib/utils/hotkeysProject";

const HotkeysDescription = () => {
  const { t } = useTranslation();
  const projectId = getProjectIdFromPathname(window.location.pathname);
  const customizationPath = projectId ? getProjectHotkeysSettingsPath(projectId) : "/user/account/hotkeys";
  const columns = [
    { title: t("editor:shortcutColumn"), dataIndex: "combo", key: "combo" },
    { title: t("editor:descriptionColumn"), dataIndex: "descr", key: "descr" },
  ];

  const keyNamespaces = Hotkey.namespaces();
  const comboNames = Hotkey.comboNames();

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
        descr: translateHotkeyDescription(comboNames[k], descr[k]),
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
      <Typography
        as="a"
        variant="body"
        size="small"
        href={customizationPath}
        className="text-primary-content hover:underline hover:text-primary-content-hover"
      >
        {projectId ? t("editor:customizeForThisProject") : t("editor:customizeHotkeys")}
      </Typography>
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
  const { t } = useTranslation();
  const showVerticalLayoutToggle =
    ff.isActive(ff.FF_FIT_ANNOTATIONS_VERTICAL_LAYOUT) && store.hasInterface("annotations:tabs") && !isAnnotatorRole();
  const isVerticalLayout = store.settings.annotationsListLayout === "vertical";

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
      {showVerticalLayoutToggle && (
        <label className={cn("settings").elem("field").toClassName()}>
          <div className={cn("settings__label").toClassName()}>
            <div className={cn("settings__label").elem("title").toClassName()}>
              {t("editor:displayAnnotationsInVerticalPanel")}
            </div>
            <div className={cn("settings__label").elem("description").toClassName()}>
              {t("editor:verticalPanelDescription")}
            </div>
          </div>
          <Toggle
            checked={isVerticalLayout}
            onChange={(event) =>
              store.settings.setAnnotationsListLayout(event.target.checked ? "vertical" : "horizontal")
            }
            description={t("editor:displayAnnotationsInVerticalPanel")}
            aria-label={t("editor:displayAnnotationsInVerticalPanel")}
            data-testid="annotations-list-layout-toggle"
          />
        </label>
      )}
    </div>
  );
});

const Settings = {
  General: { name: "General", nameKey: "editor:settingsTabGeneral", component: GeneralSettings },
  Hotkeys: { name: "Hotkeys", nameKey: "editor:settingsTabHotkeys", component: HotkeysDescription },
};

const DEFAULT_ACTIVE = Object.keys(Settings)[0];

const DEFAULT_MODAL_SETTINGS = {
  name: "settings-modal",
  closeIcon: <IconClose />,
};

export default observer(({ store }) => {
  const { t } = useTranslation();
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

  const settingsTabs = (
    <Tabs defaultActiveKey={DEFAULT_ACTIVE}>
      {Object.entries(Settings).map(([key, { nameKey, component }]) => (
        <Tabs.TabPane tab={t(nameKey)} key={key}>
          {React.createElement(component, { store })}
        </Tabs.TabPane>
      ))}
      {availableSettings.map((Page) => (
        <Tabs.TabPane tab={Page.title} key={Page.tagName}>
          <Page store={store} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );

  if (ff.isActive(ff.FF_MODAL_WINDOW_APP_CHROME)) {
    return (
      <ModalWindow
        className={cn(DEFAULT_MODAL_SETTINGS.name).toClassName()}
        open={store.showingSettings}
        onOpenChange={(open) => {
          if (!open && store.showingSettings) store.toggleSettings();
        }}
        title={t("editor:labelingInterfaceSettings")}
        size="large"
        contentClassName="max-w-[568px]"
        bodyClassName="min-h-0 p-0"
        dataTestId="editor-settings-modal"
      >
        {settingsTabs}
      </ModalWindow>
    );
  }

  return (
    <Modal
      className={cn(DEFAULT_MODAL_SETTINGS.name).toClassName()}
      open={store.showingSettings}
      onCancel={store.toggleSettings}
      footer=""
      title={t("editor:labelingInterfaceSettings")}
      closeIcon={DEFAULT_MODAL_SETTINGS.closeIcon}
    >
      {settingsTabs}
    </Modal>
  );
});
