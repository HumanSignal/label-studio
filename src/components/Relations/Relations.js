import React, { Fragment } from "react";
import { observer } from "mobx-react";
import { isValidReference } from "mobx-state-tree";
import { Icon } from "antd";

import { NodeMinimal } from "../Node";
import styles from "./Relations.module.scss"

/**
 * Relation Component
 *
 * Shows the relationship between two selected items
 */
const Relation = ({ store, rl }) => {
  if (!isValidReference(() => rl.node1) || !isValidReference(() => rl.node2)) {
    return null;
  }

  return (
    <div className={styles.block}>
      <div
        className={styles.section}
        onMouseOver={() => {
          rl.toggleHighlight();
        }}
        onMouseOut={() => {
          rl.toggleHighlight();
        }}
      >
        <div className={styles.section__blocks}>
          <div><NodeMinimal node={rl.node1} /></div>
          <Icon type="arrow-right" />
          <div><NodeMinimal node={rl.node2} /></div>
        </div>
      </div>
      <a
        href="#"
        className={styles.delete}
        onClick={() => {
          store.deleteRelation(rl);
          return false;
        }}
      >
        <Icon type="delete" />
      </a>
    </div>
  );
};

export default observer(({ store }) => {
  const completion = store.completionStore.selected;
  const { relations } = completion.relationStore;

  console.log(completion.relationStore.relations)

  return (
    <Fragment>
      <h4>Relations ({relations.length})</h4>

      {!relations.length && <p>No Relations added yet</p>}

      {completion.relationStore.relations.map(rl => (
        <Relation store={completion.relationStore} rl={rl} />
      ))}

    </Fragment>
  );
});
