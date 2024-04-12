import React from 'react';
import styles from './SimpleBadge.module.scss';

export const SimpleBadge = ({ number, className, ...props }) => (
  <div className={[styles.badge, className].filter(Boolean).join(' ')} {...props}>
    {number}
  </div>
);
