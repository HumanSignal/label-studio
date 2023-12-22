import {
  ComponentClass,
  Context,
  createContext,
  createElement,
  CSSProperties,
  FC,
  forwardRef,
  FunctionComponent,
  ReactHTML,
  ReactSVG,
  useContext
} from 'react';

interface CNMod {
  [key: string]: unknown;
}

export interface CN {
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

type CNMix = string | CN | undefined

interface CNOptions {
  elem?: string;
  mod?: Record<string, unknown>;
  mix?: CNMix | CNMix[] | undefined | undefined;
}

type ComponentType = FC<any> | ComponentClass<unknown, unknown> | FunctionComponent<unknown>
type TagNameType = keyof ReactHTML | keyof ReactSVG | string
type TagNames = keyof JSX.IntrinsicElements;
type TagAttrs<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T];

export type CNTagName = ComponentType | TagNameType;

type WrappedComponentProps<CN extends FC<any>, TN extends TagNames> = {
  component?: CN,
  tag?: TN | CN | string,
} & {
  name: string,
  block?: string,
  mod?: CNMod,
  mix?: CNMix | CNMix[],
  className?: string,
  style?: CSSProperties,
  component?: FC | CNTagName,
} & ({
  [key in keyof TagAttrs<TN>]: TagAttrs<TN>[key]
} & {
  [key in keyof Parameters<CN>[0]]: Parameters<CN>[0][key]
})

const CSS_PREFIX = process.env.CSS_PREFIX ?? 'dm-';

const assembleClass = (block: string, elem?: string, mix?: CNMix | CNMix[], mod?: CNMod) => {
  const rootName = block;
  const elemName = elem ? `${rootName}__${elem}` : null;

  const stateName = Object.entries(mod ?? {}).reduce((res, [key, value]) => {
    const stateClass = [elemName ?? rootName];

    if (value === null || value === undefined) return res;

    if (value !== false) {
      stateClass.push(key);

      if (value !== true) stateClass.push(value as string);

      res.push(stateClass.join('_'));
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
      .filter(m => {
        if (typeof m === 'string') {
          return m.trim() !== '';
        } else {
          return m !== undefined && m !== null;
        }
      })
      .map(m => {
        if (typeof m === 'string') {
          return m;
        } else {
          return m?.toClassName?.();
        }
      })
      .reduce((res, cls) => [...res, ...cls!.split(/\s+/)], [] as string[]);

    finalClass.push(...Array.from(new Set(mixMap)));
  }

  const attachNamespace = (cls: string) => {
    if (new RegExp(CSS_PREFIX).test(cls)) return cls;
    else return `${CSS_PREFIX}${cls}`;
  };

  return finalClass.map(attachNamespace).join(' ');
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
      return assembleClass(
        block,
        elem,
        mix,
        mod,
      );
    },

    toClassName() {
      return this.toString();
    },

    toCSSSelector() {
      return `.${this.toClassName().replace(/(\s+)/g, '.')}`;
    },
  };

  Object.defineProperty(classNameBuilder, 'Block', { value: Block });
  Object.defineProperty(classNameBuilder, 'Elem', { value: Elem });
  Object.defineProperty(classNameBuilder, '__class', { value: {
    block,
    elem,
    mix,
    mod,
  } });

  return classNameBuilder;
};

export const BemWithSpecifiContext = (context?: Context<CN | null>) => {
  const Context = context ?? createContext<CN|null>(null);

  const Block = forwardRef(<T extends FC<any>, D extends TagNames>({
    tag = 'div',
    name,
    mod,
    mix,
    ...rest
  }: WrappedComponentProps<T, D>, ref: any) => {
    const rootClass = cn(name);
    const finalMix = ([] as [ CNMix? ]).concat(mix).filter(cn => !!cn);
    const className = rootClass.mod(mod).mix(...(finalMix as CNMix[]), rest.className).toClassName();
    const finalProps = { ...rest, ref, className } as any;

    return createElement(Context.Provider, {
      value: rootClass,
    }, createElement(tag, finalProps));
  });

  const Elem = forwardRef(<T extends FC<any>, D extends TagNames>({
    tag = 'div',
    component,
    block,
    name,
    mod,
    mix,
    ...rest
  }: WrappedComponentProps<T, D>, ref: any) => {
    const blockCtx = useContext(Context);

    const finalMix = ([] as [ CNMix? ]).concat(mix).filter(cn => !!cn);

    const className = (block ? cn(block) : blockCtx)!
      .elem(name)
      .mod(mod)
      .mix(...(finalMix as CNMix[]), rest.className)
      .toClassName();

    const finalProps: any = { ...rest, ref, className };

    if (typeof tag !== 'string') finalProps.block = blockCtx;
    if (component) finalProps.tag = tag;

    return createElement(component ?? tag, finalProps);
  });

  Block.displayName = 'Block';

  Elem.displayName = 'Elem';

  return { Block, Elem, Context };
};

export const { Block, Elem } = BemWithSpecifiContext(BlockContext);

export const useBEM = () => {
  return useContext(BlockContext)!;
};

