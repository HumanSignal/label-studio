import { beforeEach, describe, expect, it, mock } from "bun:test";
import { LSFWrapper } from "../lsf-sdk";

// Two saves overlapping within one round-trip used to both see draftId=0 and create
// two drafts, orphaning one — the seed of the duplicate-annotation chain.
describe("LSFWrapper draft single-flight", () => {
  let wrapper;
  let annotation;
  let apiCalls;

  const makeAnnotation = (overrides = {}) => ({
    id: "ann-1",
    pk: null,
    draftId: 0,
    setDraftId(id) {
      this.draftId = id;
    },
    ...overrides,
  });

  beforeEach(() => {
    wrapper = Object.create(LSFWrapper.prototype);
    wrapper._draftCreateRequests = new Map(); // class-field init doesn't run via Object.create
    wrapper.task = { id: 42, drafts: [] };
    wrapper.saveUserLabels = mock(async () => {});
    wrapper.needsDraftSave = mock(() => true);
    wrapper.prepareData = mock(() => ({ result: [] }));
    wrapper.draftToast = mock(() => {});
    apiCalls = [];
    wrapper.datamanager = {
      invoke: mock(() => {}),
      apiCall: mock(async (method, params) => {
        apiCalls.push({ method, params });
        return { id: 100 + apiCalls.length, $meta: { status: 201 } };
      }),
    };
    annotation = makeAnnotation();
  });

  it("two concurrent saves produce one create and one update, not two creates", async () => {
    let resolveFirst;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    wrapper.datamanager.apiCall = mock(async (method, params) => {
      apiCalls.push({ method, params });
      if (apiCalls.length === 1) return firstResponse;
      return { id: 200, $meta: { status: 200 } };
    });

    const save1 = wrapper._submitDraft(annotation, {});
    const save2 = wrapper._submitDraft(annotation, {});

    // let both saves reach the API layer before the first response lands
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveFirst({ id: 101, $meta: { status: 201 } });
    await Promise.all([save1, save2]);

    const methods = apiCalls.map((c) => c.method);
    expect(methods.filter((m) => m === "createDraftForTask")).toHaveLength(1);
    expect(methods.filter((m) => m === "updateDraft")).toHaveLength(1);
    expect(annotation.draftId).toBe(101);
    expect(apiCalls.find((c) => c.method === "updateDraft").params.draftID).toBe(101);
  });

  it("sequential saves stay create-then-update", async () => {
    await wrapper._submitDraft(annotation, {});
    await wrapper._submitDraft(annotation, {});

    expect(apiCalls.map((c) => c.method)).toEqual(["createDraftForTask", "updateDraft"]);
  });

  it("a failed create does not deadlock the next save", async () => {
    let calls = 0;
    wrapper.datamanager.apiCall = mock(async (method, params) => {
      apiCalls.push({ method, params });
      calls += 1;
      if (calls === 1) throw new Error("network");
      return { id: 300, $meta: { status: 201 } };
    });

    await expect(wrapper._submitDraft(annotation, {})).rejects.toThrow("network");
    const res = await wrapper._submitDraft(annotation, {});

    expect(res.id).toBe(300);
    expect(apiCalls.map((c) => c.method)).toEqual(["createDraftForTask", "createDraftForTask"]);
    expect(annotation.draftId).toBe(300);
  });

  it("concurrent saves where the create returns no id fall back to a fresh create", async () => {
    let resolveFirst;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    wrapper.datamanager.apiCall = mock(async (method, params) => {
      apiCalls.push({ method, params });
      if (apiCalls.length === 1) return firstResponse;
      return { id: 400, $meta: { status: 201 } };
    });

    const save1 = wrapper._submitDraft(annotation, {});
    const save2 = wrapper._submitDraft(annotation, {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveFirst({ $meta: { status: 500 } }); // no id — create effectively failed
    await Promise.all([save1, save2]);

    expect(apiCalls.map((c) => c.method)).toEqual(["createDraftForTask", "createDraftForTask"]);
  });

  it("annotation with pk routes the create to createDraftForAnnotation", async () => {
    annotation = makeAnnotation({ pk: 777 });

    await wrapper._submitDraft(annotation, {});

    expect(apiCalls[0].method).toBe("createDraftForAnnotation");
    expect(apiCalls[0].params.annotationID).toBe(777);
  });
});
