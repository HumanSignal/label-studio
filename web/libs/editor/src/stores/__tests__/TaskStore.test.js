/* global test, expect */
import TaskStore from "../TaskStore";

test("Task Store with string", () => {
  const initialState = {
    id: 1,
    data: '{"url": "https://heartex.net"}',
    project: 100,
  };

  const taskStore = TaskStore.create(initialState);

  expect(taskStore.dataObj).toEqual({ url: "https://heartex.net" });
});

test("dataObj returns the real data.source value, not the serialized task object", () => {
  const serializedTask = JSON.stringify({
    id: 546585,
    annotators: [],
    annotations: [],
    data: { source: "https://host/tasks/546585/resolve/?fileuri=abc" },
  });
  const initialState = {
    id: 546585,
    data: '{"source": "https://host/tasks/546585/resolve/?fileuri=abc"}',
    source: serializedTask,
  };

  const taskStore = TaskStore.create(initialState);

  expect(taskStore.dataObj.source).toBe("https://host/tasks/546585/resolve/?fileuri=abc");
  expect(taskStore.source).toBe(serializedTask);
});

test("dataObj does not inject a source key from the task source field", () => {
  const initialState = {
    id: 1,
    data: '{"url": "https://heartex.net"}',
    source: JSON.stringify({ id: 1, annotators: [] }),
  };

  const taskStore = TaskStore.create(initialState);

  expect(taskStore.dataObj).toEqual({ url: "https://heartex.net" });
  expect("source" in taskStore.dataObj).toBe(false);
});

// test("Task Store JSON", () => {
//   const initialState = {
//     id: 1,
//     data: {url: "https://heartex.net"},
//     project: 100,
//   };

//   const taskStore = TaskStore.create(initialState);

//   expect(taskStore.dataObj).toEqual({ url: "https://heartex.net" });
// })

// test("Task Store bad value", () => {
//   const initialState = {
//     id: 1,
//     data: "Not JSON",
//     project: 100,
//   };

//   const taskStore = TaskStore.create(initialState);

//   expect(taskStore.dataObj).toEqual(null);
// })
