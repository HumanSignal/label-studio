import React from "react";
import { Modal, Checkbox } from "antd";
import { observer } from "mobx-react";

export default observer(({ store }) => {
  return (
    <Modal visible={store.showingSettings} title="Hotkeys" footer="" onCancel={store.toggleSettings}>
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
    </Modal>
  );
});
