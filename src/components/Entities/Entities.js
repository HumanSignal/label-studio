import React from "react";
import { observer } from "mobx-react";
import { Button } from "antd";

import { Node } from "../Node/Node";
import Hint from "../Hint/Hint";
import styles from "./Entities.module.scss";

export default observer(({ store, regionStore }) => {
  const { regions } = regionStore;

  let buttonRemove = () => {
    return (
      <Button
        type="link"
        style={{ paddingLeft: 0 }}
        onClick={ev => {
          store.completionStore.selected.deleteAllRegions();
          ev.preventDefault();
        }}
      >
        Remove all
        {regions.length > 0 && store.settings.enableHotkeys && store.settings.enableTooltips && (
          <Hint>[ Ctrl+bksp ]</Hint>
        )}
      </Button>
    );
  };

  return (
    <div>
      <h4>Entities ({regions.length})</h4>
      {regions.length > 0 && buttonRemove()}
      {!regions.length && <p>No Entities added yet</p>}
      {regions.length > 0 && (
        <ul className={styles.list}>
          {regions.map(region => (
            <li
              key={region.id}
              className={styles.item}
              onMouseOver={() => {
                region.toggleHightlight();
              }}
              onMouseOut={() => {
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
