/**
 * @deprecated This component is not used anywhere.
 */

import React from "react";
import { inject, observer } from "mobx-react";
import { CheckCircleOutlined, CheckOutlined } from "@ant-design/icons";

import Hint from "../Hint/Hint";
import { DraftPanel } from "../Annotations/Annotations";
import styles from "./Controls.module.scss";
import { Button } from "../../common/Button/Button";
import { Tooltip } from "../../common/Tooltip/Tooltip";
import { cn } from "../../utils/bem";

const TOOLTIP_DELAY = 0.8;

export default inject("store")(
  observer(({ item, store }) => {
    /**
     * Buttons of Controls
     */
    const buttons = {
      skip: "",
      update: "",
      submit: "",
    };

    const { userGenerate, sentUserGenerate, versions } = item;
    const { enableHotkeys, enableTooltips } = store.settings;

    /**
     * Task information
     */
    let taskInformation;
    const taskInfoClassName = cn("task-info").toClassName();
    const skipButtonClassName = cn("skip-btn").toClassName();
    const submitButtonClassName = cn("submit-btn").toClassName();
    const updateButtonClassName = cn("update-btn").toClassName();

    if (store.task) {
      taskInformation = <h4 className={`${styles.task} ${taskInfoClassName}`}>Task ID: {store.task.id}</h4>;
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
    let draftMenu;

    /**
     * Check for Predict Menu
     */
    if (!store.annotationStore.predictSelect || store.explore) {
      const disabled = store.isSubmitting;

      if (store.hasInterface("skip")) {
        skipButton = (
          <Tooltip title="Cancel (skip) task: [ Ctrl+Space ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button
              disabled={disabled}
              look="danger"
              onClick={store.skipTask}
              className={`${styles.skip} ${skipButtonClassName}`}
            >
              Skip {buttons.skip}
            </Button>
          </Tooltip>
        );
      }

      if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        submitButton = (
          <Tooltip title="Save results: [ Ctrl+Enter ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button
              disabled={disabled}
              look="primary"
              icon={<CheckOutlined />}
              onClick={store.submitAnnotation}
              className={`${styles.submit} ${submitButtonClassName}`}
            >
              Submit {buttons.submit}
            </Button>
          </Tooltip>
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        updateButton = (
          <Tooltip title="Update this task: [ Alt+Enter ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button
              disabled={disabled}
              look="primary"
              icon={<CheckCircleOutlined />}
              onClick={store.updateAnnotation}
              className={updateButtonClassName}
            >
              {sentUserGenerate || versions.result ? "Update" : "Submit"} {buttons.update}
            </Button>
          </Tooltip>
        );
      }

      if (!store.hasInterface("annotations:menu")) {
        draftMenu = <DraftPanel item={item} />;
      }
    }

    const content = (
      <div className={styles.block}>
        <div className={styles.wrapper}>
          <div className={styles.container}>
            {skipButton}
            {updateButton}
            {submitButton}
            {draftMenu}
          </div>
          {taskInformation}
        </div>
      </div>
    );

    return (item.type === "annotation" || store.explore) && content;
  }),
);
