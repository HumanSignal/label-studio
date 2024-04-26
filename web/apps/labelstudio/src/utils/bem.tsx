import {
  type ComponentClass,
  type Context,
  createContext,
  createElement,
  type CSSProperties,
  type DOMAttributes,
  forwardRef,
  type FunctionComponent,
  type ReactHTML,
  type ReactSVG,
  useContext,
} from "react";
import { isDefined, isEmptyString } from "./helpers";

interface CNMod {
  [key: string]: unknown;
}

interface CN {
  block: (name: string) => CN;
  elem: (name: string) => CN;
  mod: (mods?: CNMod) => CN;
  mix: (...mix: CNMix[] | undefined[]) => CN;
  select: (root: Document | Element) => Element | null;
  selectAll: (root: Document | Element) => NodeList | null;
  closest: (target: Element) => Element | null;
  toString: () => string;
  toClassName: () => string;
  toCSSSelector: () => string;
}

type CNMix = string | CN | undefined;

interface CNOptions {
  elem?: string;
  mod?: Record<string, unknown>;
  mix?: CNMix | CNMix[] | undefined | undefined;
}

type CNTagName =
  | keyof ReactHTML
  | keyof ReactSVG
  | ComponentClass<unknown, unknown>
  | FunctionComponent<unknown>
  | string;

type CNComponentProps = {
  name: string;
  tag?: CNTagName;
  block?: string;
  mod?: CNMod;
  mix?: CNMix | CNMix[];
  className?: string;
  component?: CNTagName;
  style?: CSSProperties;
} & DOMAttributes<HTMLElement>;

export type BemComponent = FunctionComponent<CNComponentProps>;

const CSS_PREFIX = process.env.CSS_PREFIX ?? "dm-";

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
      .filter((m) => isDefined(m) && m !== "")
      .map((m) => {
        if (typeof m === "string") {
          return m;
        }
        return m?.toClassName?.();
      })
      .reduce((res, cls) => [...res, ...cls!.split(/\s+/)], [] as string[]);

    finalClass.push(...mixMap);
  }

  const attachNamespace = (cls: string) => {
    if (typeof cls !== "string") console.error("Non-string classname: ", cls);
    return String(cls).startsWith(CSS_PREFIX) ? cls : `${CSS_PREFIX}${cls}`;
  };

  return finalClass
    .filter((cls) => !isEmptyString(cls))
    .map(attachNamespace)
    .join(" ");
};

const BlockContext = createContext<CN | null>(null);

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

    mix(...mixes) {
      return cn(block, { elem, mix: mixes, mod });
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

  Object.defineProperty(classNameBuilder, "Block", { value: Block });
  Object.defineProperty(classNameBuilder, "Elem", { value: Elem });
  Object.defineProperty(classNameBuilder, "__class", {
    value: {
      block,
      elem,
      mix,
      mod,
    },
  });

  return classNameBuilder;
};

export const BemWithSpecifiContext = (context: Context<CN | null>) => {
  const LocalContext = context ?? createContext<CN | null>(null);

  const Block: BemComponent = forwardRef(({ tag = "div", name, mod, mix, ...rest }, ref) => {
    const rootClass = cn(name);
    const finalMix = ([] as [CNMix?]).concat(mix).filter((cnm) => !!cnm);
    const className = rootClass
      .mod(mod)
      .mix(...(finalMix as CNMix[]), rest.className)
      .toClassName();
    const finalProps = { ...rest, ref, className } as any;

    return <LocalContext.Provider value={rootClass}>{createElement(tag, finalProps)}</LocalContext.Provider>;
  });

  Block.displayName = "Block";

  const Elem: BemComponent = forwardRef(({ component, block, name, mod, mix, ...rest }, ref) => {
    const blockCtx = useContext(LocalContext);

    const finalMix = ([] as [CNMix?]).concat(mix).filter((cnm) => !!cnm);
    const finalTag = rest.tag ?? "div";

    const className = (block ? cn(block) : blockCtx)!
      .elem(name)
      .mod(mod)
      .mix(...(finalMix as CNMix[]), rest.className)
      .toClassName();

    const finalProps: any = { ...rest, ref, className };

    if (typeof finalTag !== "string") finalProps.block = blockCtx;

    return createElement(component ?? finalTag, finalProps);
  });

  Elem.displayName = "Elem";

  return { Block, Elem, Context: LocalContext };
};

export const { Block, Elem } = BemWithSpecifiContext(BlockContext);
