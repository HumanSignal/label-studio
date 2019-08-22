import React from "react";
import { observer, inject } from "mobx-react";
import { Button } from "antd";

import Hint from "../Hint/Hint";
import styles from "./Controls.module.scss";

export default inject("store")(
  observer(({ store }) => {
    let taskInformation;
    let submitButton;
    let skipButton;

    if (store.task) {
      taskInformation = <h4 className={styles.task}>Task ID: {store.task.id}</h4>;
    }

    if (store.settings.enableHotkeys && store.settings.enableTooltips) {
      submitButton = <Hint> [ Ctrl+Enter ]</Hint>;
      skipButton = <Hint> [ Ctrl+Space ]</Hint>;
    }

    return (
      <div className={styles.block}>
        <div className={styles.wrapper}>
          <div className={styles.container}>
            {store.hasInterface("submit:skip") && (
              <Button type="ghost" onClick={store.skipTask} className={styles.skip}>
                Skip {skipButton}
              </Button>
            )}
            {store.hasInterface("submit:rewrite") && (
              <Button type="primary" icon="rollback" onClick={store.rewriteTask}>
                Update
              </Button>
            )}
            <Button type="primary" icon="check" onClick={store.sendTask} className={styles.submit}>
              Submit {submitButton}
            </Button>
          </div>
          {taskInformation}
        </div>
      </div>
    );
  }),
);
