import React, { ComponentClass, FunctionComponent, ReactHTML, ReactSVG } from 'react';

interface CNMod {
  [key: string]: unknown
}

interface CN {
  block: (name: string) => CN
  elem: (name: string) => CN
  mod: (mods?: CNMod) => CN
  mix: (...mix: CNMix[] | undefined[]) => CN
  select: (root: Document | Element) => Element | null
  selectAll: (root: Document | Element) => NodeList | null
  closest: (target: Element) => Element | null
  toString: () => string
  toClassName: () => string
  toCSSSelector: () => string
}

type CNMix = string | CN | undefined

interface CNOptions {
  elem?: string,
  mod?: Record<string, unknown>,
  mix?: CNMix | CNMix[] | undefined | undefined
}

type CNTagName = keyof ReactHTML | keyof ReactSVG | ComponentClass<unknown, unknown> | FunctionComponent<unknown> | string

type CNComponentProps = {
  name: string
  tag?: CNTagName
  block?: string
  mod?: CNMod
  mix?: CNMix | CNMix[]
  className?: string
  component?: CNTagName
}

type BemComponent = FunctionComponent<CNComponentProps>

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
      .filter(m => m !== undefined && m !== null && m !== "")
      .map(m => {
        if (typeof m === 'string') {
          return m;
        } else {
          return m?.toClassName?.();
        }
      })
      .reduce((res, cls) => [...res, ...cls!.split(/\s+/)], [] as string[]);

    finalClass.push(...mixMap);
  }

  const attachNamespace = (cls: string) => {
    if (new RegExp(CSS_PREFIX).test(cls)) return cls;
    else return `${CSS_PREFIX}${cls}`;
  };

  return finalClass.map(attachNamespace).join(" ");
};

const BlockContext = React.createContext<CN | null>(null);

export const cn = (block: string, options: CNOptions = {}): CN => {
  const {elem, mix, mod} = options ?? {};
  const blockName = block;

  const classNameBuilder: CN = {
    block(name) {
      return cn(name, {elem, mix, mod});
    },

    elem(name) {
      return cn(block, {elem: name, mix, mod});
    },

    mod(newMod = {}) {
      const stateOverride = Object.assign({}, mod ?? {}, newMod);
      return cn(block ?? blockName, {elem, mix, mod: stateOverride});
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
  Object.defineProperty(classNameBuilder, '__class', {value: {
    block,
    elem,
    mix,
    mod,
  }});

  return classNameBuilder;
};

export const BemWithSpecifiContext = (context: React.Context<CN | null>) => {
  const Context = context ?? React.createContext<CN|null>(null);

  const Block: BemComponent = React.forwardRef(({tag = 'div', name, mod, mix, ...rest}, ref) => {
    const rootClass = cn(name);
    const finalMix = ([] as [ CNMix? ]).concat(mix).filter(cn => !!cn);
    const className = rootClass.mod(mod).mix(...(finalMix as CNMix[]), rest.className).toClassName();
    const finalProps = {...rest, ref, className} as any;

    return (
      <Context.Provider value={rootClass}>
        {React.createElement(tag, finalProps)}
      </Context.Provider>
    );
  });
  Block.displayName = 'Block';

  const Elem: BemComponent = React.forwardRef(({tag = 'div', component, block, name, mod, mix, ...rest}, ref) => {
    const blockCtx = React.useContext(Context);

    const finalMix = ([] as [ CNMix? ]).concat(mix).filter(cn => !!cn);

    const className = (block ? cn(block) : blockCtx)!
      .elem(name)
      .mod(mod)
      .mix(...(finalMix as CNMix[]), rest.className)
      .toClassName();

    const finalProps: any = {...rest, ref, className};

    if (typeof tag !== 'string') finalProps.block = blockCtx;
    if (component) finalProps.tag = tag;

    return React.createElement(component ?? tag, finalProps);
  });
  Elem.displayName = 'Elem';

  return { Block, Elem, Context };
};

export const { Block, Elem } = BemWithSpecifiContext(BlockContext);

