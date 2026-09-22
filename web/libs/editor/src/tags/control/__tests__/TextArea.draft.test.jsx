/**
 * UTC-945: uncommitted TextArea input must survive draft autosave / reload.
 *
 * Uses Image (not RichText/Text) as the toName target so AppStore.create stays
 * stable in the full unit suite — MST reference unions are frozen at first
 * AppStore import and RichTextModel may be absent when earlier files load the store.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

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

import "../../../tags/visual/View";
import "../../../tags/object/Image/Image.js";
import "../../../tags/control/TextArea/TextArea";
import AppStore from "../../../stores/AppStore";

const TEXTAREA_CONFIG =
  '<View><Image name="img" value="$img"/><TextArea name="notes" toName="img" rows="3" showSubmitButton="true"/></View>';

const createTestEnv = () => ({
  events: {
    hasEvent: mock((name) => name === "submitDraft"),
    invoke: mock(),
    invokeFirst: mock(),
  },
  messages: {},
  settings: {},
});

function createStoreWithTextArea() {
  const env = createTestEnv();
  const store = AppStore.create(
    {
      config: TEXTAREA_CONFIG,
      task: { id: 1, data: JSON.stringify({ img: "https://example.com/test.jpg" }) },
      interfaces: ["basic"],
    },
    env,
  );
  store.initializeStore({});
  const annotation = store.annotationStore.addAnnotation({ result: [] });
  store.annotationStore.selectAnnotation(annotation.id);
  const notes = annotation.names.get("notes");
  const img = annotation.names.get("img");
  return { store, annotation, notes, img, env };
}

describe("TextArea draft persistence (UTC-945)", () => {
  it("includes pending input in draft serialization without committing to regions", async () => {
    const { annotation, notes, store } = createStoreWithTextArea();
    store.submitDraft = mock().mockResolvedValue({ id: 1 });

    notes.setValue("uncommitted draft text", { skipDraftSave: true });
    await annotation.saveDraft();

    expect(notes.regions).toHaveLength(0);
    expect(notes._value).toBe("uncommitted draft text");

    const serialized = annotation.serializeAnnotation({ fast: true });
    const textareaResult = serialized.find((r) => r.from_name === "notes");

    expect(textareaResult).toBeDefined();
    expect(textareaResult.meta?.textAreaPendingInput).toBe("uncommitted draft text");
    expect(textareaResult.value?.text).toEqual([]);
  });

  it("does not create draft noise for whitespace-only pending input", async () => {
    const { annotation, notes, store } = createStoreWithTextArea();
    store.submitDraft = mock().mockResolvedValue({ id: 1 });

    notes.setValue("   ", { skipDraftSave: true });
    await annotation.saveDraft();

    const serialized = annotation.serializeAnnotation({ fast: true });
    expect(serialized.find((r) => r.from_name === "notes")).toBeUndefined();
  });

  it("restores pending input from draft meta on needsUpdate", () => {
    const { annotation, notes, img } = createStoreWithTextArea();

    annotation.createResult({}, { text: ["committed line"] }, notes, img);
    notes.result.setMetaValue("textAreaPendingInput", "restored pending");

    notes.needsUpdate();

    expect(notes.regions.map((r) => r._value)).toEqual(["committed line"]);
    expect(notes._value).toBe("restored pending");
  });

  it("clears pending draft meta when text is committed via addText", () => {
    const { annotation, notes, img } = createStoreWithTextArea();

    annotation.createResult({}, { text: [] }, notes, img);
    notes.setValue("will commit", { skipDraftSave: true });
    notes.syncPendingDraftState();

    expect(notes.result.meta?.textAreaPendingInput).toBe("will commit");

    notes.addText("will commit");

    expect(notes.result.meta?.textAreaPendingInput).toBeUndefined();
    expect(notes.regions.map((r) => r._value)).toEqual(["will commit"]);
  });
});
