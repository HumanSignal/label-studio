export type Tip = {
  title: string,
  content: string,
  closable?: boolean,
  link: {
    url: string,
    label: string,
  },
}

export type HeidiTipsProps = {
  tips: Tip[],
}

export type HeidiTipProps = {
  tip: Tip,
}
