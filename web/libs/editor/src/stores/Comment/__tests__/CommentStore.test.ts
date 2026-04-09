import { types, getEnv, isAlive, destroy } from "mobx-state-tree";
import { CommentStore } from "../CommentStore";

const DummyAnnotation = types
  .model({ id: types.string, pk: 1, type: "annotation" })
  .volatile(() => ({
    history: { hasChanges: false },
    draftSaved: true,
  }))
  .actions(() => ({
    setCommentCount: mock(),
    setUnresolvedCommentCount: mock(),
  }));

const DummyAnnotationStore = types.model({ selected: types.maybeNull(DummyAnnotation) });

const DummyUser = types.model({ id: 1 }).volatile(() => ({
  email: "test@domain.com",
}));

const DummyRoot = types
  .model("DummyRoot", {
    annotationStore: DummyAnnotationStore,
    commentStore: CommentStore,
    user: DummyUser,
    commentClassificationConfig: types.optional(types.frozen(), {}),
  })
  .volatile(() => ({
    task: { id: 1 },
  }));

describe("CommentStore", () => {
  it("does not crash if the store is destroyed while listComments is pending", async () => {
    let resolveSdkPromise: Function;
    const sdkPromise = new Promise((res) => {
      resolveSdkPromise = res;
    });

    const sdkMock = {
      invoke: mock().mockReturnValue(sdkPromise),
    };

    const root = DummyRoot.create(
      {
        annotationStore: { selected: { id: "ann1", pk: 1, type: "annotation" } },
        commentStore: { loading: null },
        user: { id: 1 },
      },
      {
        events: sdkMock,
      },
    );

    const commentStore = root.commentStore;

    // Trigger listComments which will yield on sdk.invoke
    const listCommentsPromise = commentStore.listComments();

    // Destroy the root (making commentStore dead) while pending
    destroy(root);

    // Resolve the promise
    resolveSdkPromise([[{ id: 1, text: "A comment", created_by: 1, created_at: "2024-01-01T00:00:00.000Z" }]]);

    // Await the flow to see if it throws [dead] error
    await listCommentsPromise;

    expect(isAlive(commentStore)).toBe(false);
  });

  it("does not crash if the store is destroyed while addComment is pending", async () => {
    let resolveSdkPromise: Function;
    const sdkPromise = new Promise((res) => {
      resolveSdkPromise = res;
    });

    const sdkMock = {
      invoke: mock().mockReturnValue(sdkPromise),
    };

    const root = DummyRoot.create(
      {
        annotationStore: { selected: { id: "ann2", pk: 2, type: "annotation" } },
        commentStore: { loading: null },
        user: { id: 1 },
      },
      {
        events: sdkMock,
      },
    );

    const commentStore = root.commentStore;

    // Trigger addComment which will yield on sdk.invoke
    const addCommentPromise = commentStore.addComment("Test comment");

    // Destroy the root (making commentStore dead)
    destroy(root);

    // Resolve the promise
    resolveSdkPromise([[{ id: 2, text: "Test comment", created_by: 1, created_at: "2024-01-01T00:00:00.000Z" }]]);

    // Await the flow to see if it throws [dead] error
    await addCommentPromise;

    expect(isAlive(commentStore)).toBe(false);
  });
});
