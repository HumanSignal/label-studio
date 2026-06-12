import { mock, describe, it, expect, beforeEach } from "bun:test";
import { LSFWrapper } from "../lsf-sdk";

describe("LSFWrapper setAnnotation ID matching (FIT-1949)", () => {
  let wrapper;
  let mockLsf;

  beforeEach(() => {
    wrapper = Object.create(LSFWrapper.prototype);
    mockLsf = {
      annotationStore: {
        annotations: [],
        predictions: [],
        selectAnnotation: mock(() => {}),
        selectPrediction: mock(() => {}),
      },
    };
    wrapper.lsf = mockLsf;
    wrapper.datamanager = {
      invoke: mock(() => {}),
      store: {
        project: {
          show_collab_predictions: false,
        },
      },
    };
  });

  it("matches annotation with numeric pk when search ID is a string", async () => {
    const targetAnnotation = { pk: 97375393, id: "1", type: "annotation" };
    mockLsf.annotationStore.annotations = [targetAnnotation];
    wrapper.task = { drafts: [] };

    // Pass annotationID as number (which setAnnotation converts to string internally)
    await wrapper.setAnnotation(97375393, false, false);

    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("1");
  });

  it("matches annotation with string id when search ID is a string", async () => {
    const targetAnnotation = { pk: null, id: "alphanumeric-abc", type: "annotation" };
    mockLsf.annotationStore.annotations = [targetAnnotation];
    wrapper.task = { drafts: [] };

    await wrapper.setAnnotation("alphanumeric-abc", false, false);

    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("alphanumeric-abc");
  });
});
