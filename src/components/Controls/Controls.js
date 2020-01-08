import React from "react";
import { Button } from "antd";
import { observer, inject } from "mobx-react";

import Hint from "../Hint/Hint";
import styles from "./Controls.module.scss";

export default inject("store")(
  observer(({ item, store }) => {
    /**
     * Buttons of Controls
     */
    let buttons = {
      skip: "",
      update: "",
      submit: "",
    };

    const { userGenerate, sentUserGenerate } = item;
    const { enableHotkeys, enableTooltips } = store.settings;

    /**
     * Task information
     */
    let taskInformation;
    if (store.task) {
      taskInformation = <h4 className={styles.task + " ls-task-info"}>Task ID: {store.task.id}</h4>;
    }

    /**
     * Hotkeys
     */
    if (enableHotkeys && enableTooltips) {
      buttons.submit = <Hint> [ Ctrl+Enter ]</Hint>;
      buttons.skip = <Hint> [ Ctrl+Space ]</Hint>;
      buttons.update = <Hint> [ Alt+Enter] </Hint>;
    }

    let skipButton;
    let updateButton;
    let submitButton;

    /**
     * Check for Predict Menu
     */
    if (!store.completionStore.predictSelect || store.explore) {
      if (store.hasInterface("skip")) {
        skipButton = (
          <Button type="ghost" onClick={store.skipTask} className={styles.skip + " ls-skip-btn"}>
            Skip {buttons.skip}
          </Button>
        );
      }

      if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        submitButton = (
          <Button
            type="primary"
            icon="check"
            onClick={store.submitCompletion}
            className={styles.submit + " ls-submit-btn"}
          >
            Submit {buttons.submit}
          </Button>
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        updateButton = (
          <Button type="primary" icon="rollback" onClick={store.updateCompletion} className="ls-update-btn">
            Update {buttons.update}
          </Button>
        );
      }
    }

    let content = (
      <div className={styles.block}>
        <div className={styles.wrapper}>
          <div className={styles.container}>
            {skipButton}
            {updateButton}
            {submitButton}
          </div>
          {taskInformation}
        </div>
      </div>
    );

    return (item.type === "completion" || store.explore) && content;
  }),
);
