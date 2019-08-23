import React from "react";
import { Modal, Checkbox, Tabs } from "antd";
import { observer } from "mobx-react";

export default observer(({ store }) => {
  return (
    <Modal
      visible={store.showingSettings}
      title="Settings"
      bodyStyle={{ paddingTop: "0" }}
      footer=""
      onCancel={store.toggleSettings}
    >
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Hotkeys" key="1">
          <Checkbox
            value="Enable labeling hotkeys"
            defaultChecked={store.settings.enableHotkeys}
            onChange={() => {
              store.settings.toggleHotkeys();
            }}
          >
            Enable labeling hotkeys
          </Checkbox>
          <br />
          <Checkbox
            value="Show tooltips"
            defaultChecked={store.settings.enableTooltips}
            onChange={() => {
              store.settings.toggleTooltips();
            }}
          >
            Show tooltips
          </Checkbox>
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
});
