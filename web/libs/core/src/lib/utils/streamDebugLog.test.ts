import { logLabelStreamDebug, logReviewStreamDebug } from "./streamDebugLog";

describe("streamDebugLog", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("logs label stream queue metadata in the classic format", () => {
    logLabelStreamDebug({
      queue: "Sequence queue",
      taskId: 42,
      projectId: 7,
      userId: 3,
      annotationId: 99,
    });

    expect(logSpy).toHaveBeenCalledWith("[LABEL STREAM] Sequence queue, task 42, project 7, user 3, annotation 99");
  });

  it("omits annotation suffix for new-annotation placeholder", () => {
    logLabelStreamDebug({
      queue: "Skip queue (requeue for me)",
      taskId: 1,
      projectId: 2,
      userId: 1,
      annotationId: "new-annotation",
    });

    expect(logSpy).toHaveBeenCalledWith("[LABEL STREAM] Skip queue (requeue for me), task 1, project 2, user 1");
  });

  it("logs review stream queue metadata in the classic format", () => {
    logReviewStreamDebug({
      queue: "Automatically assigned annotation #5 & Random sampling queue",
      taskId: 10,
      projectId: 7,
      userId: 3,
      annotationId: 5,
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[REVIEW STREAM] Automatically assigned annotation #5 & Random sampling queue, task 10, project 7, user 3, annotation 5",
    );
  });

  it("uses unknown when review stream project id is missing", () => {
    logReviewStreamDebug({
      queue: "Sequence queue",
      taskId: 271,
      projectId: undefined,
      userId: 7,
      annotationId: 99,
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[REVIEW STREAM] Sequence queue, task 271, project unknown, user 7, annotation 99",
    );
  });

  it("uses unknown when label stream project id is missing", () => {
    logLabelStreamDebug({
      queue: "Sequence queue",
      taskId: 271,
      projectId: undefined,
      userId: 7,
    });

    expect(logSpy).toHaveBeenCalledWith("[LABEL STREAM] Sequence queue, task 271, project unknown, user 7");
  });
});
