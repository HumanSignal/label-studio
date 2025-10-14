/**
 * BEM (Block Element Modifier) utility for creating CSS class names
 *
 * This utility provides a flexible way to create BEM-style CSS class names
 * with support for blocks, elements, modifiers, and mixing.
 *
 * @note This utility uses `any` types intentionally for flexibility with BEM patterns.
 * @note Non-null assertions are used where type safety is guaranteed by the BEM structure.
 */
import {
  type Context,
  type FC,
  type ComponentClass,
  type FunctionComponent,
  type ReactHTML,
  type ReactSVG,
  type CSSProperties,
  type DOMAttributes,
  createElement,
  createContext,
  forwardRef,
  useContext,
} from "react";

type CNMod = Record<string, string | boolean | number | null | undefined>;
type CNMix = string | CN | undefined | null;

type TagNames = keyof HTMLElementTagNameMap | FC<any>;
type ComponentType = FC<any> | ComponentClass<unknown, unknown> | FunctionComponent<unknown>;
type TagNameType = keyof ReactHTML | keyof ReactSVG | string;

export type CNTagName = ComponentType | TagNameType;

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

type CNComponentProps = {
  name: string;
  tag?: CNTagName;
  block?: string;
  mod?: CNMod;
  mix?: CNMix | CNMix[];
  className?: string;
  component?: CNTagName;
  style?: CSSProperties;
  rawClassName?: string;
} & DOMAttributes<HTMLElement>;

export type BemComponent = FunctionComponent<CNComponentProps>;

const CSS_PREFIX = process.env.CSS_PREFIX ?? "ls-";

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
    // Safely convert to string and filter out invalid values
    if (!cls) return ""; // Empty value null/undefined/""
    const className = String(cls).trim();
    if (!className) return ""; // Empty string " "
    return className.startsWith(CSS_PREFIX) || CSS_PREFIX === "" ? className : `${CSS_PREFIX}${className}`;
  };

  return finalClass
    .map(attachNamespace)
    .filter((cls) => cls !== "")
    .join(" ");
};

export const BlockContext = createContext<CN | null>(null);

const cn = (block: string, options: CNOptions = {}): CN => {
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

export { cn as cnb };

export const BemWithSpecificContext = (context?: Context<CN | null>) => {
  const Context = context ?? createContext<CN | null>(null);

  const Block = forwardRef(
    <T extends FC<any>, D extends TagNames>(
      { tag = "div", name, mod, mix, rawClassName, ...rest }: WrappedComponentProps<T, D>,
      ref: any,
    ) => {
      const rootClass = cn(name);
      const finalMix = ([] as [CNMix?]).concat(mix).filter((cn) => !!cn);
      const className = [
        rootClass
          .mod(mod)
          .mix(...(finalMix as CNMix[]), rest.className)
          .toClassName(),
        rawClassName,
      ]
        .filter(Boolean)
        .join(" ");
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
      { tag = "div", component, block, name, mod, mix, rawClassName, ...rest }: WrappedComponentProps<T, D>,
      ref: any,
    ) => {
      const blockCtx = useContext(Context);

      const finalMix = ([] as [CNMix?]).concat(mix).filter((cn) => !!cn);

      const className = [
        (block ? cn(block) : blockCtx)!
          .elem(name)
          .mod(mod)
          .mix(...(finalMix as CNMix[]), rest.className)
          .toClassName(),
        rawClassName,
      ]
        .filter(Boolean)
        .join(" ");

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

export const { Block, Elem } = BemWithSpecificContext(BlockContext);

export const useBEM = () => {
  return useContext(BlockContext)!;
};
