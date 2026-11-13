mockModule("keymaster", () => {
  let scope = "all";
  const keymaster = () => {};
  keymaster.unbind = () => {};
  keymaster.setScope = (nextScope) => {
    scope = nextScope ?? scope;
  };
  keymaster.getScope = () => scope;
  return { __esModule: true, default: keymaster };
});

import "../../visual/View";
import "../../object/Image/Image.js";
import "../Number";
import AppStore from "../../../stores/AppStore";

function createNumber(attributes = "") {
  const store = AppStore.create(
    {
      config: `<View><Image name="img" value="$img"/><Number name="number" toName="img" ${attributes}/></View>`,
      task: { id: 1, data: JSON.stringify({ img: "https://example.com/test.jpg" }) },
      interfaces: ["basic"],
    },
    { events: { hasEvent: mock(() => false), invoke: mock() }, messages: {}, settings: {} },
  );
  store.initializeStore({});
  const annotation = store.annotationStore.addAnnotation({ result: [] });
  store.annotationStore.selectAnnotation(annotation.id);
  return { annotation, number: annotation.names.get("number") };
}

describe("Number input", () => {
  it("starts empty without a serialized result", () => {
    const { annotation, number } = createNumber();

    expect(number.number).toBeNull();
    expect(annotation.serializeAnnotation()).toEqual([]);
  });

  it.each([
    ["0", 0],
    ["-7", -7],
    ["007", 7],
  ])("normalizes %s and removes it from serialized results when cleared", (text, value) => {
    const { annotation, number } = createNumber();
    const input = document.createElement("input");
    input.type = "number";
    input.value = text;
    number.onChange({ target: input });
    expect(input.value).toBe(String(value));
    expect(annotation.serializeAnnotation()[0].value.number).toBe(value);

    input.value = "";
    number.onChange({ target: input });

    expect(input.value).toBe("");
    expect(number.number).toBeNull();
    expect(annotation.serializeAnnotation()).toEqual([]);
  });

  it("keeps the existing default behavior after clearing a required number", () => {
    const { annotation, number } = createNumber('required="true" defaultValue="5"');
    number.onChange({ target: { value: "8" } });
    number.onChange({ target: { value: "" } });
    expect(annotation.serializeAnnotation()).toEqual([]);

    number.beforeSend();

    expect(number.number).toBe(5);
    expect(annotation.serializeAnnotation()[0].value.number).toBe(5);
  });
});
