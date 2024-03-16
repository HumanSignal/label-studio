import * as postcss from 'postcss';

type PrefixerOptions = {
  prefix: string;
  ignore?: (string | RegExp)[];
  ignorePaths?: (string | RegExp)[];
  matchPaths?: (string | RegExp)[];
  rules?: Omit<PrefixerOptions, "rules">[]
}

function prefix(options: PrefixerOptions) {
  return function(root: postcss.Root, result: postcss.Result) {
    if (options.rules && options.rules.length > 0) {
      return matchOverRules(options.rules, root, result);
    }

    return matchOverRules([options], root, result);
  }
}

function matchOverRules(rules: PrefixerOptions[], root: postcss.Root, result: postcss.Result) {
  rules.forEach((rule) => {
    if (isIgnoredPath(result.opts.from, rule.ignorePaths)) return;

    root.walkRules((cssRule) => {
      if (!isMatchedPath(result.opts.from, rule.matchPaths)) return;
      if (isIgnoredParent(cssRule)) return;

      cssRule.selectors = cssRule.selectors.map((selector) => {
        if (!selector.startsWith('.')) return selector;

        const clearSelector = selector.replace(/^\./g, '');

        const result = clearSelector.split(' ').map((part) => {
          if (part === '' || part === '*') return part;
          return part.split('.').map((sel) => {
            if (sel === '') return sel;
            if (isIgnoredSelector(sel, rule.ignore) || sel.startsWith("." + rule.prefix)) return sel;
            return `.${rule.prefix}${sel.replace(/^\./g, '')}`;
          }).join('');
        }).join(' ');


        return result;
      })
    });
  });
}

function isIgnoredSelector(selector: string, ignored: PrefixerOptions['ignore']) {
  if (!ignored || ignored.length === 0) return false;

  return ignored.some((ignore) => {
    if (ignore instanceof RegExp) return ignore.test(selector);
    return selector.startsWith(ignore)
  });
}

function isIgnoredParent(cssRule: postcss.Rule) {
  let parent: postcss.Document | postcss.Container<postcss.ChildNode> | undefined = cssRule.parent;

  if (parent && 'name' in parent && parent.name.match(/keyframes/)) return true;

  while (parent) {
    if (parent.type === 'root') return false;
    if ('name' in parent && parent.name.includes('global')) return false

    parent = parent.parent;
  }

  return false;
}

function isIgnoredPath(path: string | undefined, ignoredPaths: PrefixerOptions['ignorePaths']) {
  if (!ignoredPaths || ignoredPaths.length === 0 || !path) return false;

  return ignoredPaths.some((ignoredPath) => {
    if (ignoredPath instanceof RegExp) {
      return ignoredPath.test(path);
    } else {
      return path.includes(ignoredPath);
    }
  });
}

function isMatchedPath(path: string | undefined, matchPaths: PrefixerOptions['matchPaths']) {
  if (!matchPaths || matchPaths.length === 0 || !path) return true;

  return matchPaths.some((matchPath) => {
    if (matchPath instanceof RegExp) {
      return matchPath.test(path);
    } else {
      return path.includes(matchPath);
    }
  });
}

export { prefix, type PrefixerOptions }
