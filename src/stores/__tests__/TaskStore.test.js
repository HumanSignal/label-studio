import TaskStore from "../TaskStore";

test("Task Store is good result", () => {
  const initialState = {
    id: 1,
    data: '{"url":"https://heartex.net"}',
    project: 100,
  };

  const taskStore = TaskStore.create(initialState);

  expect(taskStore.dataObj).toEqual({ url: "https://heartex.net" });
});

test("Task Store is bad", () => {
  const initialState = {
    id: 1,
    data: "Not JSON",
    project: 100,
  };

  const taskStore = TaskStore.create(initialState);

  expect(taskStore.dataObj).toEqual(null);
})
