import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import { Button, Icon } from "antd";

import styles from "./Panel.module.scss";
import Hint from "../Hint/Hint";
import Segment from "../Segment/Segment";

/**
 * Panel component with buttons:
 * Undo
 * Redo
 * Reset
 * Show Instructions
 * Settings
 */
export default observer(({ store }) => {
  const { history } = store.completionStore.selected;

  return (
    <div className={styles.container}>
      <div className={`${styles.block} ${styles.block__controls}`}>
        <Button
          type="ghost"
          icon="undo"
          onClick={ev => {
            history && history.canUndo && history.undo();
            ev.preventDefault();
          }}
        >
          Undo
          {store.settings.enableHotkeys && store.settings.enableTooltips && <Hint>[ Ctrl+z ]</Hint>}
        </Button>
        <Button
          type="ghost"
          icon="redo"
          onClick={ev => {
            history && history.canRedo && history.redo();
            ev.preventDefault();
          }}
        >
          Redo
        </Button>
        <Button
          type="ghost"
          icon="rest"
          onClick={ev => {
            history && history.reset();
          }}
        >
          Reset
        </Button>
        {store.setPrelabeling && (
          <Button
            style={{ display: "none" }}
            onClick={ev => {
              store.resetPrelabeling();
            }}
          >
            {" "}
            Reset Prelabeling
          </Button>
        )}
      </div>

      <div className={styles.block}>
        {store.showingDescription && (
          <Button
            type="primary"
            onClick={ev => {
              store.closeDescription();
            }}
          >
            Hide Instructions
          </Button>
        )}
        {!store.showingDescription && (
          <Button
            type="primary"
            onClick={ev => {
              store.openDescription();
            }}
          >
            Show Instructions
          </Button>
        )}

        <Button
          type="dashed"
          icon="setting"
          onClick={ev => {
            store.toggleSettings();
            ev.preventDefault();
            return false;
          }}
        />
      </div>
    </div>
  );
});
