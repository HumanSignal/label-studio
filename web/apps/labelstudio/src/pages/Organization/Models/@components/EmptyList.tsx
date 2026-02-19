import { Button } from "@humansignal/ui";
import type { FC } from "react";
import styles from "./EmptyList.module.scss";
import { HeidiAi } from "apps/labelstudio/src/assets/images";

export const EmptyList: FC = () => {
  return (
    <div className={styles["empty-models-list"]}>
      <div className={`${styles["empty-models-list"]} ${styles["empty-models-list__content"]}`}>
        <div className={styles["empty-models-list"]}>
          <HeidiAi />
        </div>
        <div className={`${styles["empty-models-list"]} ${styles["empty-models-list__title"]}`}>Create a Model</div>
        <div className={`${styles["empty-models-list"]} ${styles["empty-models-list__caption"]}`}>
          Build a high quality model to auto-label your data using LLMs
        </div>
        <Button aria-label="Create new model">Create a Model</Button>
      </div>
    </div>
  );
};
