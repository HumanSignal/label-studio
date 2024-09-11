import { DataManager } from "./sdk";

if (process.env.NODE_ENV !== "production") {
  console.warn("window.DataManager");
  // Set access to DataManager for testing
  // console.warn when accessing
  window.DataManager = new Proxy(DataManager, {
    construct(target, args) {
      console.warn("Accessing window.DataManager constructor");
      return new target(...args);
    },
    get(target, prop) {
      console.warn(`Accessing window.DataManager property: ${prop}`);
      return target[prop];
    },
  });
}

export default DataManager;
