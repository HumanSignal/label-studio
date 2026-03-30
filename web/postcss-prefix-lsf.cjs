"use strict";

const selectorParser = require("postcss-selector-parser");

const PREFIX = "lsf-";

function shouldSkipPrefix(className) {
  if (className.includes("ant")) return true;
  if (/^(antd|cm)?-|^anticon/.test(className)) return true;
  return false;
}

function isPrefixCssFile(from) {
  if (!from) return false;
  const normalized = from.split("\\").join("/");
  return /\.prefix\.css$/i.test(normalized);
}

function isInsideGlobalPseudo(node) {
  let n = node.parent;
  while (n) {
    if (n.type === "pseudo") {
      const val = n.value.replace(/^:/, "");
      if (val === "global") return true;
    }
    n = n.parent;
  }
  return false;
}

function unwrapGlobalPseudos(selector) {
  const pseudos = [];
  selector.walkPseudos((pseudo) => {
    const val = pseudo.value.replace(/^:/, "");
    if (val === "global" && pseudo.nodes && pseudo.nodes.length) {
      pseudos.push(pseudo);
    }
  });
  pseudos.sort((a, b) => depth(b) - depth(a));
  for (const pseudo of pseudos) {
    pseudo.replaceWith(...pseudo.nodes);
  }
}

function depth(node) {
  let d = 0;
  let n = node;
  while (n.parent) {
    d += 1;
    n = n.parent;
  }
  return d;
}

function processSelector(selectorStr) {
  return selectorParser((selectors) => {
    selectors.each((selector) => {
      selector.walkClasses((classNode) => {
        if (isInsideGlobalPseudo(classNode)) return;
        const name = classNode.value;
        if (shouldSkipPrefix(name)) return;
        if (name.startsWith(PREFIX)) return;
        classNode.value = PREFIX + name;
      });
      unwrapGlobalPseudos(selector);
    });
  }).processSync(selectorStr);
}

function isInsideKeyframes(rule) {
  let p = rule.parent;
  while (p) {
    if (p.type === "atrule" && /keyframes/i.test(p.name)) return true;
    p = p.parent;
  }
  return false;
}

function postcssPrefixLsfClasses() {
  return {
    postcssPlugin: "postcss-prefix-lsf-classes",
    OnceExit(root) {
      const from = root.source?.input?.from;
      if (!isPrefixCssFile(from)) return;

      root.walkRules((rule) => {
        if (isInsideKeyframes(rule)) return;
        try {
          rule.selector = processSelector(rule.selector);
        } catch {
          /* keep original selector */
        }
      });
    },
  };
}

postcssPrefixLsfClasses.postcss = true;

module.exports = { postcssPrefixLsfClasses };
