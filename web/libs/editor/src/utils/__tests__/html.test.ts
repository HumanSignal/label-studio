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
    // HTML parses <![CDATA[ as a bogus comment ending at the first >, so only inert text is left, as in the browser
    input: '<?xml version="1.0" encoding="ISO-8859-1"?><foo><![CDATA[<script>alert(\'XSS\');</script>]]></foo>',
    expected: "alert('XSS');]]&gt;",
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

  test.each([
    ["<svg><animate attributeName=x dur=1s onbegin=alert(1)></animate></svg>", ""],
    ["<svg><set attributeName=x to=1 onend=alert(1) onrepeat=alert(1)></set></svg>", ""],
    ["<div tabindex=1 autofocus onfocusin=alert(1)>x</div>", '<div tabindex="1">x</div>'],
    [
      '<div style="animation:a 1s" onanimationstart=alert(1) ontransitionend=alert(1)>x</div>',
      '<div style="animation:a 1s">x</div>',
    ],
    ["<b onpointerover=alert(1) ontouchstart=alert(1)>x</b>", "<b>x</b>"],
    ["<DIV ONPOINTERDOWN=alert(1) OnFocusIn=alert(1)>x</DIV>", "<div>x</div>"],
    [
      '<iframe src="https://www.youtube.com/embed/a" onload=alert(1)></iframe>',
      '<iframe src="https://www.youtube.com/embed/a"></iframe>',
    ],
  ])("strips any on* event handler attribute: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test("keeps attributes that only contain 'on' outside the name prefix", () => {
    const input = '<a href="/x" title="one" data-on="1">keep</a>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  // INT-30729: a <button formaction="javascript:..."> stretched over the viewport ran script on any click.
  // Forms and buttons are outside the allowlist, so the overlay and its action are both gone; the text stays.
  test("drops a javascript: formaction overlay button, keeping its text", () => {
    const style = "position:fixed;top:0;left:0;width:100vw;height:100vh;opacity:0.01;z-index:99999";
    const input = `<form><button formaction="javascript:alert('XSS-'+document.domain)" style="${style}">x</button></form>`;
    expect(sanitizeHtml(input)).toBe("x");
  });

  test.each([
    ['<form action="javascript:alert(1)"><button>x</button></form>', "x"],
    ['<input type="submit" formaction="javascript:alert(1)">', ""],
    ['<button formaction="JaVaScRiPt:alert(1)">x</button>', "x"],
    ['<button formaction=" \tjava&#x09;script:alert(1)">x</button>', "x"],
    ['<button formaction="&#106;avascript:alert(1)">x</button>', "x"],
    ['<button formaction="vbscript:msgbox(1)">x</button>', "x"],
    ['<button formaction="data:text/html,<script>alert(1)</script>">x</button>', "x"],
    ['<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>', "<a>x</a>"],
    ['<object data="javascript:alert(1)"></object>', ""],
    ['<a href="/x" ping="javascript:alert(1)">x</a>', '<a href="/x">x</a>'],
    [
      '<table background="javascript:alert(1)"><tr><td>x</td></tr></table>',
      "<table><tbody><tr><td>x</td></tr></tbody></table>",
    ],
    ['<video poster="javascript:alert(1)"></video>', "<video></video>"],
  ])("strips script-capable URLs from every URL attribute: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test.each([
    '<a href="https://example.com/x">x</a>',
    '<table background="https://example.com/bg.png"><tbody><tr><td>x</td></tr></tbody></table>',
    '<video poster="https://example.com/p.png"></video>',
  ])("keeps http(s) URL attributes: %s", (input) => {
    expect(sanitizeHtml(input)).toBe(input);
  });

  test.each([
    [
      '<svg><a><animate attributeName="href" values="javascript:alert(1)"></animate><text>x</text></a></svg>',
      "<a>x</a>",
    ],
    ['<svg><a><set attributeName="xlink:href" to="javascript:alert(1)"></set><text>x</text></a></svg>', "<a>x</a>"],
    [
      '<svg><a><animate attributeName=" HREF " from="javascript:alert(1)" to="x" by="y"></animate></a></svg>',
      "<a></a>",
    ],
  ])("drops SVG animations that would rewrite href: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test("strips invalid iframe src (bad URL)", () => {
    expect(sanitizeHtml('<iframe src="not-a-url"></iframe>')).toBe("");
  });

  test.each([
    [
      '<iframe src="https://www.youtube.com/embed/x" srcdoc="<script>alert(1)</script>"></iframe>',
      '<iframe src="https://www.youtube.com/embed/x"></iframe>',
    ],
    ['<form action="javascript:alert(1)"><button formaction="javascript:alert(1)">go</button></form>', "go"],
    ['<form><input type="submit" formaction="javascript:alert(1)"></form>', ""],
    ['<object data="javascript:alert(1)"></object>', ""],
    ['<embed src="https://example.com/x.swf">', ""],
    ['<base href="https://evil.example/">', ""],
    ['<meta http-equiv="refresh" content="0;url=javascript:alert(1)">', ""],
    ['<link rel="stylesheet" href="https://evil.example/x.css">', ""],
    ['<svg><a xlink:href="javascript:alert(1)"><text y="20">x</text></a></svg>', "<a>x</a>"],
    ['<math><mi xlink:href="javascript:alert(1)">x</mi></math>', "x"],
    ['<svg><animate attributeName="href" to="javascript:alert(1)" /><a><text>x</text></a></svg>', "<a>x</a>"],
    ['<video poster="javascript:alert(1)"></video>', "<video></video>"],
    [
      '<table background="javascript:alert(1)"><tr><td>x</td></tr></table>',
      "<table><tbody><tr><td>x</td></tr></tbody></table>",
    ],
    ['<isindex action="javascript:alert(1)">', ""],
    ['<portal src="https://evil.example"></portal>', ""],
    ["<template><img src=x onerror=alert(1)></template>", ""],
  ])("removes active content: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test.each([
    "<noscript>&lt;/noscript&gt;&lt;img src=x onerror=alert(1)&gt;</noscript>",
    "<option>&lt;img src=x onerror=alert(1)&gt;</option>",
    "<svg><style><img src=x onerror=alert(1)></style></svg>",
    "<math><style><img src=x onerror=alert(1)></style></math>",
  ])("does not let text re-parse into elements: %s", (input) => {
    const div = document.createElement("div");
    div.innerHTML = sanitizeHtml(input);
    expect(div.querySelector("[onerror]")).toBeNull();
  });

  // Raw-text parser differentials: sanitize-html (htmlparser2) and the browser must agree on where raw text ends,
  // or text the sanitizer passes through as raw becomes markup in the browser
  test.each([
    "<style></style/><img src=x onerror=alert(1)></style>",
    "<style></style/ ><img src=x onerror=alert(1)></style>",
    "<STYLE></STYLE/><img src=x onerror=alert(1)></STYLE>",
    "<p>a<style></style\t/><img src=x onerror=alert(1)></style>b</p>",
    '<iframe src="https://www.youtube.com/embed/x"><style></iframe><img src=x onerror=alert(1)></style></iframe>',
    '<iframe src="https://www.youtube.com/embed/x"><title></iframe><img src=x onerror=alert(1)></title></iframe>',
    '<iframe src="https://www.youtube.com/embed/x"></iframe/><img src=x onerror=alert(1)>',
  ])("does not let raw text end differently in the browser: %s", (input) => {
    const output = sanitizeHtml(input);
    expect(output).not.toMatch(/onerror/i);
    const template = document.createElement("template");
    template.innerHTML = output;
    expect(template.content.querySelector("[onerror]")).toBeNull();
  });

  test("keeps the text of a style block that the browser ends early", () => {
    expect(sanitizeHtml("<style>p{color:red}</style/><p>after</p>")).toBe("<style>p{color:red}</style><p>after</p>");
  });

  test("drops the fallback content of a kept iframe", () => {
    expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/x"><b>fallback</b></iframe>')).toBe(
      '<iframe src="https://www.youtube.com/embed/x"></iframe>',
    );
  });

  test.each([
    '<a href="javascript:alert(1)">a</a>',
    '<a href="JaVaScRiPt:alert(1)">a</a>',
    '<a href="jav&#x61;script:alert(1)">a</a>',
    '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">a</a>',
    '<a href="java\tscript:alert(1)">a</a>',
    '<a href=" javascript:alert(1)">a</a>',
    '<a href="javascript&colon;alert(1)">a</a>',
    '<a href="data:text/html,<script>alert(1)</script>">a</a>',
    '<a href="vbscript:x">a</a>',
    '<a href="ftp://x">a</a>',
  ])("strips disallowed link schemes: %s", (input) => {
    expect(sanitizeHtml(input)).toBe("<a>a</a>");
  });

  test("scheme-checks every srcset candidate", () => {
    expect(sanitizeHtml('<img srcset="javascript:alert(1) 1x, https://ok/a.png 2x">')).toBe(
      '<img srcset="https://ok/a.png 2x" />',
    );
  });

  test.each([
    [
      '<!DOCTYPE html><html><head><title>Doc</title><style>body{font-family:serif} .hl{color:red}</style></head><body><h1 class="hl">Title</h1><p>Para <b>bold</b> <a href="https://example.com/x" target="_blank" rel="noopener">link</a></p></body></html>',
      '<html><head><title>Doc</title><style>body{font-family:serif} .hl{color:red}</style></head><body><h1 class="hl">Title</h1><p>Para <b>bold</b> <a href="https://example.com/x" target="_blank" rel="noopener">link</a></p></body></html>',
    ],
    [
      '<table border="1" cellpadding="2"><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td style="color:blue" align="center">a</td><td rowspan="1">b</td></tr></tbody></table>',
      '<table border="1" cellpadding="2"><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td style="color:blue" align="center">a</td><td rowspan="1">b</td></tr></tbody></table>',
    ],
    [
      '<img src="/tasks/1/resolve/?fileuri=czM6Ly9iL2EucG5n" alt="a" width="100"><img src="https://cdn.example.com/a.png" srcset="https://cdn.example.com/a@2x.png 2x">',
      '<img src="/tasks/1/resolve/?fileuri=czM6Ly9iL2EucG5n" alt="a" width="100" /><img src="https://cdn.example.com/a.png" srcset="https://cdn.example.com/a@2x.png 2x" />',
    ],
    [
      '<video controls poster="https://x/p.png"><source src="https://x/v.mp4" type="video/mp4"><track kind="captions" src="/c.vtt" srclang="en"></video>',
      '<video controls poster="https://x/p.png"><source src="https://x/v.mp4" type="video/mp4"></source><track kind="captions" src="/c.vtt" srclang="en"></track></video>',
    ],
    [
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/abc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/abc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
    ],
    [
      '<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%;" src="https://www.canva.com/design/DAF/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>',
      '<iframe loading="lazy" style="position:absolute;width:100%;height:100%" src="https://www.canva.com/design/DAF/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>',
    ],
    [
      '<ul><li>one</li><li value="3">two</li></ul><ol start="2" type="a"><li>x</li></ol><dl><dt>t</dt><dd>d</dd></dl>',
      '<ul><li>one</li><li value="3">two</li></ul><ol start="2" type="a"><li>x</li></ol><dl><dt>t</dt><dd>d</dd></dl>',
    ],
    [
      '<pre><code class="language-js">const a = 1 &lt; 2;</code></pre><blockquote cite="https://example.com">q</blockquote>',
      '<pre><code class="language-js">const a = 1 &lt; 2;</code></pre><blockquote cite="https://example.com">q</blockquote>',
    ],
    [
      '<div data-x="1" class="c" id="i" title="t" lang="en" dir="rtl" aria-label="l" role="note">ok</div>',
      '<div data-x="1" class="c" id="i" title="t" lang="en" dir="rtl" aria-label="l" role="note">ok</div>',
    ],
    [
      '<font color="red" face="Arial" size="3">old</font><center>c</center><span style="background:url(https://x/y.png)">bg</span>',
      '<font color="red" face="Arial" size="3">old</font><center>c</center><span style="background:url(https://x/y.png)">bg</span>',
    ],
    [
      '<a href="/relative">r</a><a href="#frag">f</a><a href="//cdn.example">p</a><a href="mailto:x@y.z">m</a><a href="tel:+1">t</a>',
      '<a href="/relative">r</a><a href="#frag">f</a><a href="//cdn.example">p</a><a href="mailto:x@y.z">m</a><a href="tel:+1">t</a>',
    ],
  ])("keeps regular content unchanged: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  test.each([
    ["<svg><text>t</text></svg>", "t"],
    ['<custom-el foo="1">c</custom-el>', "c"],
  ])("unwraps elements outside the allowlist: %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  describe("ALLOWED_IFRAME_DOMAINS configuration", () => {
    let prevSettings: any;

    beforeEach(() => {
      prevSettings = (window as any).APP_SETTINGS;
    });

    afterEach(() => {
      (window as any).APP_SETTINGS = prevSettings;
    });

    test("allows Canva embed iframe by default", () => {
      // Default list (in services/lso/web/libs/editor/src/utils/sanitizeHtml.js) ships with Canva.
      delete (window as any).APP_SETTINGS;
      const input = '<iframe src="https://www.canva.com/design/DAHK/view?embed=access_restricted"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).toContain("iframe");
      expect(result).toContain("canva.com");
    });

    test("uses APP_SETTINGS.allowed_iframe_domains override when provided", () => {
      (window as any).APP_SETTINGS = { allowed_iframe_domains: ["example.com"] };
      expect(sanitizeHtml('<iframe src="https://example.com/x"></iframe>')).toContain("iframe");
      // Domains absent from the override (and not on the default list) are still rejected.
      expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toBe("");
      expect(sanitizeHtml('<iframe src="https://www.canva.com/design/DAHK/view"></iframe>')).toBe("");
    });

    test("falls back to defaults when APP_SETTINGS.allowed_iframe_domains is empty", () => {
      (window as any).APP_SETTINGS = { allowed_iframe_domains: [] };
      expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain("iframe");
      expect(sanitizeHtml('<iframe src="https://www.canva.com/design/DAHK/view"></iframe>')).toContain("iframe");
    });

    test("falls back to defaults when APP_SETTINGS.allowed_iframe_domains is not an array", () => {
      (window as any).APP_SETTINGS = { allowed_iframe_domains: "not-an-array" };
      expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain("iframe");
    });

    test("override still rejects non-https iframes", () => {
      (window as any).APP_SETTINGS = { allowed_iframe_domains: ["example.com"] };
      expect(sanitizeHtml('<iframe src="http://example.com/x"></iframe>')).toBe("");
    });
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
