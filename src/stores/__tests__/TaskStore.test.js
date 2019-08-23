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
