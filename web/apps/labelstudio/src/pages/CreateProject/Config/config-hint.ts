/**
 * Highly improved version of CodeMirror's XML hint addon
 * https://codemirror.net/5/addon/hint/xml-hint.js
 */
import CM from "codemirror";

const Pos = CM.Pos;
const topTags = ["View"];

function matches(hint: string, typed: string, matchInMiddle?: boolean) {
  if (matchInMiddle) return hint.includes(typed);
  return hint.startsWith(typed);
}

type CMCursor = {
  line: number;
  ch: number;
};

type CMToken = {
  start: number;
  end: number;
  string: string;
  type: string;
  state: any;
};

type CMSchemaItemAttr = {
  name: string;
  description: string;
  type: string | string[];
  required: boolean;
  default: any;
};

type CMSchemaItem = {
  name: string;
  description?: string;
  attrs?: Record<string, CMSchemaItemAttr>;
  children?: string[];
};

type CMHintResult = {
  text: string;
  name?: string;
  description?: string;
  type?: string | string[];
  link?: string;
  render: (el: Element, self: any, data: CMHintResult) => void;
};

type CMHintOptions = {
  schemaInfo: Record<string, CMSchemaItem>;
  quoteChar?: string;
  matchInMiddle?: boolean;
};

/**
 * Renders hint with nice formatting
 * @param el CodeMirror hint item
 * @param self list of all hints
 * @param data current hint
 */
function richHint(el: Element, self: any, data: CMHintResult) {
  const name = document.createElement("b");

  name.appendChild(document.createTextNode(data.name ?? data.text));
  name.className = "CodeMirror-hint-name";

  if (data.link) {
    const link = document.createElement("a");

    link.href = data.link;
    link.appendChild(name);

    el.appendChild(link);
  } else {
    el.appendChild(name);
  }

  if (data.type) {
    const type = document.createElement("span");
    const value = Array.isArray(data.type) ? data.type.join(" | ") : data.type;

    type.appendChild(document.createTextNode(value));
    type.className = "CodeMirror-hint-type";
    el.appendChild(document.createTextNode(" "));
    el.appendChild(type);
  }

  if (data.description) {
    const description = document.createElement("span");

    description.className = "CodeMirror-hint-description";
    description.appendChild(document.createTextNode(data.description));
    el.appendChild(document.createTextNode(" — "));
    el.appendChild(description);
  }

  el.classList.add("CodeMirror-hint-tag");
}

function getHints(cm: any, options: CMHintOptions) {
  const tags = options && options.schemaInfo;
  let quote = (options && options.quoteChar) || '"';
  const matchInMiddle = options && options.matchInMiddle;

  if (!tags) return;

  const cur: CMCursor = cm.getCursor();
  const token: CMToken = cm.getTokenAt(cur);

  if (token.end > cur.ch) {
    token.end = cur.ch;
    token.string = token.string.slice(0, cur.ch - token.start);
  }
  let inner = CM.innerMode(cm.getMode(), token.state);

  if (!inner.mode.xmlCurrentTag) return;

  const result: CMHintResult[] = [];
  let replaceToken = false;
  let prefix: string | undefined;
  const tag = /\btag\b/.test(token.type) && !/>$/.test(token.string);
  const tagName = tag && /^\w/.test(token.string);
  let tagStart: number | undefined;
  let tagType: "open" | "close" | null = null;

  if (tagName) {
    const before = cm.getLine(cur.line).slice(Math.max(0, token.start - 2), token.start);

    tagType = /<\/$/.test(before) ? "close" : /<$/.test(before) ? "open" : null;

    if (tagType) tagStart = token.start - (tagType === "close" ? 2 : 1);
  } else if (tag && token.string === "<") {
    tagType = "open";
  } else if (tag && token.string === "</") {
    tagType = "close";
  }

  const tagInfo = inner.mode.xmlCurrentTag(inner.state);

  if ((!tag && !tagInfo) || tagType) {
    // Tag name completion
    if (tagName) {
      prefix = token.string;
    }
    replaceToken = !!tagType;
    const context = inner.mode.xmlCurrentContext ? inner.mode.xmlCurrentContext(inner.state) : [];

    inner = context.length && context[context.length - 1];

    const curTag = inner && tags[inner];
    const childList = inner ? curTag && curTag.children : topTags;

    if (childList && tagType !== "close") {
      for (const name of childList)
        if (!prefix || matches(name, prefix, matchInMiddle))
          result.push({ text: `<${name}`, name, description: tags[name].description, render: richHint });
    } else if (tagType !== "close") {
      for (const name in tags)
        if (name !== "!attrs" && (!prefix || matches(name, prefix, matchInMiddle)))
          result.push({ text: `<${name}`, name, description: tags[name].description, render: richHint });
    }
    if (inner && (!prefix || (tagType === "close" && matches(inner, prefix, matchInMiddle))))
      result.push({ text: `</${inner}>`, render: richHint });
  } else {
    // Attribute completion
    const curTag: CMSchemaItem = tagInfo && tags[tagInfo.name];
    const attrs = curTag && curTag.attrs;

    if (!attrs) return;
    if (token.type === "string" || token.string === "=") {
      // Attribute value completion
      const before = cm.getRange(
        Pos(cur.line, Math.max(0, cur.ch - 60)),
        Pos(cur.line, token.type === "string" ? token.start : token.end),
      );
      const atName = before.match(/([^\s\u00a0=<>"']+)=$/);
      const atValues = atName?.[1] ? attrs[atName[1]]?.type : undefined;

      if (!atName || !Object.prototype.hasOwnProperty.call(attrs, atName[1])) return;
      if (!atValues || !Array.isArray(atValues)) return;
      if (token.type === "string") {
        prefix = token.string;
        let n = 0;

        if (/['"]/.test(token.string.charAt(0))) {
          quote = token.string.charAt(0);
          prefix = token.string.slice(1);
          n++;
        }
        const len = token.string.length;

        if (/['"]/.test(token.string.charAt(len - 1))) {
          quote = token.string.charAt(len - 1);
          prefix = token.string.substr(n, len - 2);
        }
        if (n) {
          // an opening quote
          const line = cm.getLine(cur.line);

          if (line.length > token.end && line.charAt(token.end) === quote) token.end++; // include a closing quote
        }
        replaceToken = true;
      }
      const returnHintsFromAtValues = (atValues: string[]) => {
        for (const value of atValues)
          if (!prefix || matches(value, prefix, matchInMiddle))
            result.push({ text: quote + value + quote, render: richHint });
        return returnHints();
      };

      return returnHintsFromAtValues(atValues);
    }
    // An attribute name completion
    if (token.type === "attribute") {
      prefix = token.string;
      replaceToken = true;
    }
    for (const attr in attrs) {
      if (prefix && !matches(attr, prefix, matchInMiddle)) continue;

      const name = attrs[attr].required ? `${attr}*` : attr;
      const type = attrs[attr].type;

      result.push({ text: attr, name, type, description: attrs[attr].description, render: richHint });
    }
  }
  function returnHints() {
    return {
      list: result,
      from: replaceToken ? Pos(cur.line, tagStart === undefined ? token.start : tagStart) : cur,
      to: replaceToken ? Pos(cur.line, token.end) : cur,
    };
  }
  return returnHints();
}

CM.registerHelper("hint", "xml", getHints);
