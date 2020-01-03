import React from "react";
import { Card } from "antd";
import { observer } from "mobx-react";

import Entities from "../Entities/Entities";
import Entity from "../Entity/Entity";
import Relations from "../Relations/Relations";
import styles from "./SideColumn.module.scss";

/**
 * Component Side with:
 * Completions
 * Entities
 * Relations
 */
export default observer(({ store }) => {
  const completion = store.completionStore.selected;
  const node = completion.highlightedNode;

  let title = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <h3 style={{ margin: 0 }}>Entity</h3>
    </div>
  );

  return (
    <Card title={title} size="small" className={styles.card}>
      {node && <Entity store={store} completion={completion} />}

      {!completion.highlightedNode && <p>Nothing selected</p>}

      <Entities store={store} regionStore={completion.regionStore} />

      <Relations store={store} item={completion} />
    </Card>
  );
});
