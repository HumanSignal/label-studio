import { sanitizeInstructionsHtml } from "../sanitizeHtml";

const PAYLOAD =
  '<link rel="stylesheet" href="https://cdn.example.com/guide.css"><embed src="https://docs.example.com/a.pdf" type="application/pdf"><object data="https://docs.example.com/b.pdf" type="application/pdf"></object><iframe src="https://docs.example.com/c.pdf"></iframe><form action="https://forms.example.com/x"><input type="checkbox" name="ok"><button type="submit">Send</button></form><h1>Guide</h1>';

const render = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = sanitizeInstructionsHtml(html);
  return div;
};

describe("sanitizeInstructionsHtml", () => {
  let prevSettings: unknown;

  beforeEach(() => {
    prevSettings = (window as any).APP_SETTINGS;
  });

  afterEach(() => {
    (window as any).APP_SETTINGS = prevSettings;
  });

  const setOptIn = (value: boolean | undefined) => {
    (window as any).APP_SETTINGS = { allow_unsafe_instruction_tags: value };
  };

  test.each([false, undefined])("applies the labeling allowlist without the opt-in (%s)", (value) => {
    setOptIn(value);
    const div = render(PAYLOAD);

    expect(div.querySelector("link, embed, object, form, input, button")).toBeNull();
    expect(div.querySelector("iframe")).toBeNull();
    expect(div).toHaveTextContent("Guide");
  });

  test("keeps stylesheets, embedded documents, https iframes and forms after the organization opts in", () => {
    setOptIn(true);
    const div = render(PAYLOAD);

    expect(div.querySelector('link[rel="stylesheet"][href="https://cdn.example.com/guide.css"]')).not.toBeNull();
    expect(div.querySelector('embed[src="https://docs.example.com/a.pdf"]')).not.toBeNull();
    expect(div.querySelector('object[data="https://docs.example.com/b.pdf"]')).not.toBeNull();
    expect(div.querySelector('iframe[src="https://docs.example.com/c.pdf"]')).not.toBeNull();
    expect(div.querySelector('form[action="https://forms.example.com/x"] input[type="checkbox"]')).not.toBeNull();
    expect(div.querySelector('button[type="submit"]')).not.toBeNull();
  });

  test("still strips script-capable content after the organization opts in", () => {
    setOptIn(true);
    const div = render(
      '<base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=https://evil.example"><script>window.x=1</script><svg><a xlink:href="javascript:alert(1)"><text>s</text></a></svg><link rel="stylesheet" href="javascript:alert(1)"><embed src="javascript:alert(1)"><object data="javascript:alert(1)"></object><form action="javascript:alert(1)"><button formaction="javascript:alert(1)">b</button></form><iframe src="http://docs.example.com/x"></iframe><iframe src="https://www.youtube.com/embed/x" srcdoc="<script>alert(1)</script>"></iframe><img src="x" onerror="alert(1)"><p>ok</p>',
    );

    expect(div.querySelector("base, meta, script, svg")).toBeNull();
    expect(
      div.querySelector(
        '[href^="javascript:"], [src^="javascript:"], [data^="javascript:"], [action^="javascript:"], [formaction]',
      ),
    ).toBeNull();
    expect(div.querySelector('iframe[src^="http:"]')).toBeNull();
    expect(div.querySelector("iframe[srcdoc]")).toBeNull();
    expect(div.querySelector("[onerror]")).toBeNull();
    expect(div).toHaveTextContent("ok");
  });
  test.each([false, true])("does not let raw text end differently in the browser (opt-in %s)", (value) => {
    setOptIn(value);
    for (const input of [
      "<style></style/><img src=x onerror=alert(1)></style>",
      '<iframe src="https://docs.example.com/a.pdf"><style></iframe><img src=x onerror=alert(1)></style></iframe>',
    ]) {
      expect(sanitizeInstructionsHtml(input)).not.toMatch(/onerror/i);
    }
  });
});
