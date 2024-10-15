import type { TipsCollection } from "./content";

export type Tip = {
  title: string;
  content: string;
  closable?: boolean;
  link: {
    url: string;
    label: string;
    params?: Record<string, string>;
  };
};

export type HeidiTipsProps = {
  collection: keyof typeof TipsCollection;
};

export type HeidiTipProps = {
  tip: Tip;
  onDismiss: () => void;
};
