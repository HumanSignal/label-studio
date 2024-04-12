import React from 'react';
import { sanitizeHtml } from '../../utils/html';
import styles from './ErrorMessage.module.scss';

export const ErrorMessage = ({ error }) => {
  if (typeof error === 'string') {
    return <div className={styles.error} dangerouslySetInnerHTML={{ __html: sanitizeHtml(error) }} />;
  }
  const body = error instanceof Error ? error.message : error;

  return <div className={styles.error}>{body}</div>;
};
