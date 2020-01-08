import React from "react";
import { Button, Popconfirm } from "antd";
import { observer } from "mobx-react";

import Hint from "../Hint/Hint";
import styles from "./Entities.module.scss";
import { Node } from "../Node/Node";

export default observer(({ store, regionStore }) => {
  const { regions } = regionStore;
  const c = store.completionStore.selected;

  const buttonRemove = () => {
    const confirm = () => {
      c.deleteAllRegions();
    };

    return (
      <Popconfirm
        placement="bottomLeft"
        title={"Please confirm you want to delete all labeled regions"}
        onConfirm={confirm}
        okText="Delete"
        okType="danger"
        cancelText="Cancel"
      >
        <Button type="link" style={{ paddingLeft: 0 }}>
          Remove all
          {regions.length > 0 && store.settings.enableHotkeys && store.settings.enableTooltips && (
            <Hint>[ Ctrl+bksp ]</Hint>
          )}
        </Button>
      </Popconfirm>
    );
  };

  return (
    <div>
      <h4>Entities ({regions.length})</h4>
      {regions.length > 0 && c.edittable === true && buttonRemove()}
      {!regions.length && <p>No Entities added yet</p>}
      {regions.length > 0 && (
        <ul className={styles.list}>
          {regions.map(region => (
            <li
              key={region.id}
              className={styles.item}
              onMouseOver={() => {
                // region.setHighlight(true);

                region.toggleHightlight();
              }}
              onMouseOut={() => {
                // region.setHighlight(false);
                region.toggleHightlight();
              }}
            >
              <Node node={region} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
