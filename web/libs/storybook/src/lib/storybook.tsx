import styles from "./storybook.module.scss";

/* eslint-disable-next-line */
export type StorybookProps = {};

export function Storybook(props: StorybookProps) {
  return (
    <div className={styles.container}>
      <h1>Welcome to Storybook!</h1>
    </div>
  );
}

export default Storybook;
