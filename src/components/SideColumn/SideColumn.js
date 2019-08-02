import React, { Component } from "react";
import { Card } from "antd";
import { observer } from "mobx-react";

import Relations from "../Relations/Relations";
import Entities from "../Entities/Entities";
import Entity from "../Entity/Entity";
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

  return (
    <Card title="Entity" className={styles.card}>
      {node && <Entity store={store} completion={completion} />}

      {!completion.highlightedNode && <p>Nothing selected</p>}

      <Entities store={store} regionStore={completion.regionStore} />

      <Relations store={store} item={completion} />
    </Card>
  );
});
