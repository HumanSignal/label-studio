import "../../../tags/visual/View";
import "../../../tags/object/Image/Image";
import "../../../tags/control/BrushLabels";
import "../../../tags/control/RectangleLabels";
import AppStore from "../../AppStore";
import { types } from "mobx-state-tree";

let DrawingAppStore;
beforeAll(async () => {
  // Other suites may load AppStore before drawing controls are registered.
  // Rebuild this fixture's reference union after its controls are available.
  const { default: AnnotationStore } = await import(`../store?bun_reload=${Date.now()}`);
  DrawingAppStore = AppStore.props({
    annotationStore: types.optional(AnnotationStore, { annotations: [], predictions: [], history: [] }),
  });
});

function setup(tag = "BrushLabels") {
  const store = DrawingAppStore.create(
    {
      config: `<View><Image name="img" value="$img" /><${tag} name="label" toName="img"><Label value="A" /><Label value="B" /></${tag}></View>`,
      task: { id: 1, data: JSON.stringify({ img: "test.jpg" }) },
      interfaces: ["basic"],
    },
    { events: { hasEvent: () => false, invoke: () => {} }, messages: {}, settings: {} },
  );
  store.initializeStore({});
  const annotation = store.annotationStore.addAnnotation({ result: [] });
  store.annotationStore.selectAnnotation(annotation.id);
  const control = annotation.names.get("label");
  const image = annotation.names.get("img");
  const value = tag === "BrushLabels" ? { touches: [], coordstype: "px" } : { x: 10, y: 10, width: 20, height: 20 };
  const region = annotation.createResult(value, { [control.type]: ["A"] }, control, image);
  annotation.selectArea(region);
  control.children[0].setSelected(true);
  return { annotation, control, image, region, value, a: control.children[0], b: control.children[1] };
}

describe("label hotkeys during continuous drawing", () => {
  for (const tag of ["BrushLabels", "RectangleLabels"]) {
    it(`${tag}: switching prepares a new region without relabeling the selected one`, () => {
      const { annotation, control, image, region, value, b } = setup(tag);
      b.onHotKey();
      expect(region.results[0].value[control.type]).toEqual(["A"]);
      expect(annotation.selectedRegions).toHaveLength(0);
      expect(control.selectedValues()).toEqual(["B"]);
      const next = annotation.createResult(value, control.getResultValue(), control, image);
      expect(next.id).not.toBe(region.id);
      expect(next.results[0].value[control.type]).toEqual(["B"]);
      expect(region.results[0].value[control.type]).toEqual(["A"]);
    });
  }

  it("pressing the same label again keeps it ready for a new region", () => {
    const { annotation, control, region, a } = setup();
    a.onHotKey();
    expect(annotation.selectedRegions).toHaveLength(0);
    expect(control.selectedValues()).toEqual(["A"]);
    expect(region.results[0].value[control.type]).toEqual(["A"]);
    a.onHotKey();
    expect(control.selectedValues()).toEqual(["A"]);
  });

  it("clicking a label still explicitly relabels the selected region", () => {
    const { control, region, b } = setup();
    b.onClick();
    expect(region.results[0].value[control.type]).toEqual(["B"]);
  });

  it("ignores hotkeys while a stroke is in progress", () => {
    const { annotation, control, region, b } = setup();
    annotation.setIsDrawing(true);
    b.onHotKey();
    expect(region.results[0].value[control.type]).toEqual(["A"]);
    expect(annotation.selectedRegions).toContain(region);
    expect(control.selectedValues()).toEqual(["A"]);
  });

  it("leaves every selected region unchanged when switching labels", () => {
    const { annotation, control, image, region, value, b } = setup();
    const second = annotation.createResult(value, { brushlabels: ["A"] }, control, image);
    annotation.selectAreas([region, second]);
    b.onHotKey();
    expect(region.results[0].value.brushlabels).toEqual(["A"]);
    expect(second.results[0].value.brushlabels).toEqual(["A"]);
    expect(annotation.selectedRegions).toHaveLength(0);
    expect(control.selectedValues()).toEqual(["B"]);
  });
});
