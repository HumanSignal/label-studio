import { DataManager } from "./sdk";

if (process.env.NODE_ENV === "development" && !process.env.BUILD_NO_SERVER) {
  import("./dev").then(({ initDevApp }) => initDevApp(DataManager));
}

window.DataManager = DataManager;

export default DataManager;
