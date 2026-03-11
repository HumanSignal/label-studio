import {
  sanitizeHtml,
  htmlEscape,
  matchesSelector,
  findByXpath,
  isValidTreeNode,
  getNodesInRange,
  getTextNodesInRange,
  findNodeAt,
  removeSpans,
} from "../html";

const htmlSanitizeList = [
  {
    input: '<iframe src="http://malicious.com"></iframe>',
    expected: "",
  },
  {
    input: "<script>alert('XSS');</script>",
    expected: "",
  },
  {
    input: "\"><img src=x onerror=alert('XSS')>",
    expected: '"&gt;<img src="x" />',
  },
  {
    input: "<script>alert(1)</script foo='bar'>",
    expected: "",
  },
  {
    input: "><script>alert('XSS')</script>",
    expected: "&gt;",
  },
  {
    input: '<?xml version="1.0" encoding="ISO-8859-1"?><foo><![CDATA[<script>alert(\'XSS\');</script>]]></foo>',
    expected: "<foo></foo>",
  },
  {
    input: "It's a test to check if <, > and & are escaped",
    expected: "It's a test to check if &lt;, &gt; and &amp; are escaped",
  },
];

describe("Helper function html sanitize", () => {
  test("sanitize html list", () => {
    htmlSanitizeList.forEach((item) => {
      expect(sanitizeHtml(item.input)).toBe(item.expected);
    });
  });

  test("returns empty string for falsy input", () => {
    expect(sanitizeHtml()).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  test("allows whitelisted YouTube iframe (https)", () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).toContain("iframe");
    expect(result).toContain("youtube.com");
  });

  test("allows youtube-nocookie and youtu.be iframes", () => {
    expect(sanitizeHtml('<iframe src="https://youtu.be/abc"></iframe>')).toContain("iframe");
    expect(sanitizeHtml('<iframe src="https://www.youtube-nocookie.com/embed/x"></iframe>')).toContain("iframe");
  });

  test("strips iframe with non-https src", () => {
    expect(sanitizeHtml('<iframe src="http://www.youtube.com/embed/abc"></iframe>')).toBe("");
  });

  test("strips event handler attributes", () => {
    const input = '<div onclick="alert(1)" onload="x">safe</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onload");
    expect(result).toContain("safe");
  });

  test("strips invalid iframe src (bad URL)", () => {
    expect(sanitizeHtml('<iframe src="not-a-url"></iframe>')).toBe("");
  });
});

describe("htmlEscape", () => {
  test("returns string unchanged when no special chars", () => {
    expect(htmlEscape("plain text")).toBe("plain text");
  });

  test("escapes double quote", () => {
    expect(htmlEscape('"')).toBe("&quot;");
  });

  test("escapes ampersand", () => {
    expect(htmlEscape("&")).toBe("&amp;");
  });

  test("escapes single quote", () => {
    expect(htmlEscape("'")).toBe("&#39;");
  });

  test("escapes less-than and greater-than", () => {
    expect(htmlEscape("<")).toBe("&lt;");
    expect(htmlEscape(">")).toBe("&gt;");
  });

  test("escapes multiple characters in one string", () => {
    expect(htmlEscape('<a href="x">')).toBe("&lt;a href=&quot;x&quot;&gt;");
  });

  test("coerces non-string to string", () => {
    expect(htmlEscape(123)).toBe("123");
  });
});

describe("matchesSelector", () => {
  test("returns true when element matches selector", () => {
    const el = document.createElement("div");
    el.className = "foo";
    expect(matchesSelector(el, ".foo")).toBe(true);
  });

  test("returns true when element has matching descendant (closest)", () => {
    const parent = document.createElement("div");
    parent.className = "parent";
    const child = document.createElement("span");
    parent.appendChild(child);
    expect(matchesSelector(child, ".parent")).toBe(true);
  });

  test("returns false when element and ancestors do not match", () => {
    const el = document.createElement("div");
    el.className = "other";
    expect(matchesSelector(el, ".foo")).toBe(false);
  });
});

describe("findByXpath", () => {
  test("finds node by xpath in document", () => {
    const div = document.createElement("div");
    div.id = "xpath-target";
    document.body.appendChild(div);
    const found = findByXpath("//*[@id='xpath-target']");
    expect(found).toBe(div);
    document.body.removeChild(div);
  });

  test("prepends dot when root is not document", () => {
    const root = document.createElement("div");
    const span = document.createElement("span");
    span.setAttribute("data-test", "x");
    root.appendChild(span);
    const found = findByXpath("//span[@data-test='x']", root);
    expect(found).toBe(span);
  });
});

describe("isValidTreeNode", () => {
  test("returns true when node is commonAncestor", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    expect(isValidTreeNode(parent, parent)).toBe(true);
  });

  test("returns false when node has data-skip-node", () => {
    const parent = document.createElement("div");
    const skip = document.createElement("span");
    skip.dataset.skipNode = "true";
    parent.appendChild(skip);
    expect(isValidTreeNode(skip, parent)).toBe(false);
  });

  test("returns true when node is ancestor of commonAncestor", () => {
    const root = document.createElement("div");
    const mid = document.createElement("div");
    const leaf = document.createElement("span");
    root.appendChild(mid);
    mid.appendChild(leaf);
    expect(isValidTreeNode(root, mid)).toBe(true);
  });

  test("returns true when commonAncestor is null", () => {
    const el = document.createElement("div");
    expect(isValidTreeNode(el, null)).toBe(true);
  });
});

describe("getNodesInRange and getTextNodesInRange", () => {
  test("getNodesInRange returns nodes in range", () => {
    const div = document.createElement("div");
    div.innerHTML = "one";
    const text = div.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 3);
    const nodes = getNodesInRange(range);
    expect(nodes).toContain(text);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  test("getTextNodesInRange returns only text nodes", () => {
    const div = document.createElement("div");
    div.innerHTML = "hello";
    const text = div.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    const nodes = getTextNodesInRange(range);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].nodeType).toBe(Node.TEXT_NODE);
  });
});

describe("findNodeAt", () => {
  test("returns node and offset at character position", () => {
    const div = document.createElement("div");
    div.innerHTML = "ab";
    const [node, offset] = findNodeAt(div, 1);
    expect(node).toBe(div.firstChild);
    expect(offset).toBe(1);
  });

  test("navigates into child when position is within child text", () => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = "xy";
    div.appendChild(span);
    const [node, offset] = findNodeAt(div, 1);
    expect(node).toBe(span.firstChild);
    expect(offset).toBe(1);
  });
});

describe("removeSpans", () => {
  test("unwraps spans and normalizes parent", () => {
    const parent = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = "inner";
    parent.appendChild(span);
    removeSpans([span]);
    expect(parent.textContent).toBe("inner");
    expect(parent.querySelector("span")).toBeNull();
  });

  test("handles empty or null spans", () => {
    expect(() => removeSpans(null)).not.toThrow();
    expect(() => removeSpans([])).not.toThrow();
  });
});
