/**
 * Simplified BEM utility for Modal component
 * Based on the BEM implementation from datamanager/editor
 *
 * @note This utility uses `any` types intentionally for flexibility with BEM patterns.
 * @note Non-null assertions are used where type safety is guaranteed by the BEM structure.
 */
// biome-ignore lint/complexity/noBannedTypes: Generic BEM utility requires flexible typing
// biome-ignore lint/suspicious/noExplicitAny: Generic BEM utility requires any for flexibility
import { type Context, type FC, createElement, createContext, forwardRef, useContext } from "react";

type CNMod = Record<string, string | boolean | number | null | undefined>;
type CNMix = string | CN | undefined | null;

type TagNames = keyof HTMLElementTagNameMap | FC<any>;

export type CN = {
  block(name: string): CN;
  elem(name: string): CN;
  mod(mod?: CNMod): CN;
  mix(...mix: CNMix[]): CN;
  select(root?: Element | Document): Element | null;
  selectAll(root?: Element | Document): NodeListOf<Element>;
  closest(root: Element): Element | null;
  toString(): string;
  toClassName(): string;
  toCSSSelector(): string;
};

type CNOptions = {
  elem?: string;
  mix?: CNMix | CNMix[];
  mod?: CNMod;
};

type WrappedComponentProps<CN extends FC<any>, TN extends TagNames> = Omit<
  Parameters<CN>[0],
  "tag" | "name" | "mod" | "mix" | "block"
> &
  Omit<JSX.IntrinsicElements[TN extends keyof HTMLElementTagNameMap ? TN : "div"], "ref"> & {
    tag?: TN;
    component?: CN;
    name: string;
    mod?: CNMod;
    mix?: CNMix | CNMix[];
    block?: CN;
    rawClassName?: string;
  } & (TN extends keyof HTMLElementTagNameMap
    ? {
        [key in keyof JSX.IntrinsicElements[TN]]: JSX.IntrinsicElements[TN][key];
      }
    : {
        [key in keyof Parameters<CN>[0]]: Parameters<CN>[0][key];
      });

const CSS_PREFIX = "";

const assembleClass = (block: string, elem?: string, mix?: CNMix | CNMix[], mod?: CNMod) => {
  const rootName = block;
  const elemName = elem ? `${rootName}__${elem}` : null;

  const stateName = Object.entries(mod ?? {}).reduce((res, [key, value]) => {
    const stateClass = [elemName ?? rootName];

    if (value === null || value === undefined) return res;

    if (value !== false) {
      stateClass.push(key);

      if (value !== true) stateClass.push(value as string);

      res.push(stateClass.join("_"));
    }
    return res;
  }, [] as string[]);

  const finalClass: string[] = [];

  finalClass.push(elemName ?? rootName);

  finalClass.push(...stateName);

  if (mix) {
    const mixes = Array.isArray(mix) ? mix : [mix];
    const mixMap = ([] as CNMix[])
      .concat(...mixes)
      .filter((m) => {
        if (typeof m === "string") {
          return m.trim() !== "";
        }
        return m !== undefined && m !== null;
      })
      .map((m) => {
        if (typeof m === "string") {
          return m;
        }
        return m?.toClassName?.();
      })
      .reduce((res, cls) => [...res, ...cls!.split(/\s+/)], [] as string[]);

    finalClass.push(...Array.from(new Set(mixMap)));
  }

  const attachNamespace = (cls: string) => {
    if (typeof cls !== "string") console.error("Non-string classname: ", cls);
    return String(cls).startsWith(CSS_PREFIX) || CSS_PREFIX === "" ? cls : `${CSS_PREFIX}${cls}`;
  };

  return finalClass.map(attachNamespace).join(" ");
};

export const BlockContext = createContext<CN | null>(null);

export const cn = (block: string, options: CNOptions = {}): CN => {
  const { elem, mix, mod } = options ?? {};
  const blockName = block;

  const classNameBuilder: CN = {
    block(name) {
      return cn(name, { elem, mix, mod });
    },

    elem(name) {
      return cn(block, { elem: name, mix, mod });
    },

    mod(newMod = {}) {
      const stateOverride = Object.assign({}, mod ?? {}, newMod);

      return cn(block ?? blockName, { elem, mix, mod: stateOverride });
    },

    mix(...mix) {
      return cn(block, { elem, mix, mod });
    },

    select(root = document) {
      return root.querySelector(this.toCSSSelector());
    },

    selectAll(root = document) {
      return root.querySelectorAll(this.toCSSSelector());
    },

    closest(root) {
      return root.closest(this.toCSSSelector());
    },

    toString() {
      return assembleClass(block, elem, mix, mod);
    },

    toClassName() {
      return this.toString();
    },

    toCSSSelector() {
      return `.${this.toClassName().replace(/(\s+)/g, ".")}`;
    },
  };

  return classNameBuilder;
};

export const BemWithSpecificContext = (context?: Context<CN | null>) => {
  const Context = context ?? createContext<CN | null>(null);

  const Block = forwardRef(
    <T extends FC<any>, D extends TagNames>(
      { tag = "div", name, mod, mix, rawClassName, ...rest }: WrappedComponentProps<T, D>,
      ref: any,
    ) => {
      const rootClass = cn(name);
      const finalMix = ([] as [CNMix?]).concat(mix).filter((cn) => !!cn);
      const className =
        rawClassName ||
        rootClass
          .mod(mod)
          .mix(...(finalMix as CNMix[]), rest.className)
          .toClassName();
      const finalProps = { ...rest, ref, className } as any;

      return createElement(
        Context.Provider,
        {
          value: rootClass,
        },
        createElement(tag as any, finalProps),
      );
    },
  );

  const Elem = forwardRef(
    <T extends FC<any>, D extends TagNames>(
      { tag = "div", component, block, name, mod, mix, ...rest }: WrappedComponentProps<T, D>,
      ref: any,
    ) => {
      const blockCtx = useContext(Context);

      const finalMix = ([] as [CNMix?]).concat(mix).filter((cn) => !!cn);

      const className = (block ? cn(block) : blockCtx)!
        .elem(name)
        .mod(mod)
        .mix(...(finalMix as CNMix[]), rest.className)
        .toClassName();

      const finalProps: any = { ...rest, ref, className };

      if (typeof tag !== "string") finalProps.block = blockCtx;
      if (component) finalProps.tag = tag;

      return createElement(component ?? tag, finalProps);
    },
  );

  Block.displayName = "Block";

  Elem.displayName = "Elem";

  return { Block, Elem, Context };
};
