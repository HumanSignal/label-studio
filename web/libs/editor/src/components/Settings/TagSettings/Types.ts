import { FC } from 'react';

export interface Settings<T = Record<string, any>> extends FC<{store: any} & T> {
  tagName: string;
  title: string;
}
