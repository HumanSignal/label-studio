import type { FC } from "react";

export type PageProps = {
  children: React.ReactNode;
};

export type PageComponent = FC<PageProps>;

export type PageContext = FC<PageProps>;

export type PageSettings = {
  path: string;
  title?: string | ((options: any) => string);
  titleRaw?: string;
  exact?: boolean;
  context?: PageContext;
} & (
  | {
      component?: PageComponent;
      pages?: Page[];
    }
  | {
      layout?: PageLayout;
      routes?: any[];
    }
);

export type PageLayoutSettingt = Omit<PageSettings, "path">;

export type PageLayout = PageLayoutSettingt | (PageComponent & PageLayoutSettingt);

export type Page = PageSettings | (PageComponent & PageSettings);
