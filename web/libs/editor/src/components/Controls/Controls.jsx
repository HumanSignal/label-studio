import { inject, observer } from "mobx-react";
import { CheckCircleOutlined, CheckOutlined } from "@ant-design/icons";

import Hint from "../Hint/Hint";
import { DraftPanel } from "../Annotations/Annotations";
import styles from "./Controls.module.scss";
import { Button } from "@humansignal/ui";
import { cn } from "../../utils/bem";

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
      const task = store.task;
      const allowSkip = task?.allow_skip !== false; // Default to true if undefined
      const skipDisabled = disabled || !allowSkip;
      const skipTooltip = allowSkip ? "Cancel (skip) task: [ Ctrl+Space ]" : "This task cannot be skipped";

      if (store.hasInterface("skip")) {
        skipButton = (
          <Button
            disabled={skipDisabled}
            look="danger"
            onClick={allowSkip ? store.skipTask : undefined}
            tooltip={skipTooltip}
            className={`${styles.skip} ${skipButtonClassName}`}
          >
            Skip {buttons.skip}
          </Button>
        );
      }

      if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        submitButton = (
          <Button
            disabled={disabled}
            look="primary"
            icon={<CheckOutlined />}
            onClick={store.submitAnnotation}
            tooltip="Save results: [ Ctrl+Enter ]"
            className={`${styles.submit} ${submitButtonClassName}`}
          >
            Submit {buttons.submit}
          </Button>
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        updateButton = (
          <Button
            disabled={disabled}
            look="primary"
            icon={<CheckCircleOutlined />}
            onClick={store.updateAnnotation}
            tooltip="Update this task: [ Alt+Enter ]"
            className={updateButtonClassName}
          >
            {sentUserGenerate || versions.result ? "Update" : "Submit"} {buttons.update}
          </Button>
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
