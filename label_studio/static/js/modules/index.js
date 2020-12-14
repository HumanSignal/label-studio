import { DataManager } from "@heartex/datamanager";
import '@heartex/datamanager/build/static/css/main.css';

const dmRoot = document.querySelector(".datamanager");

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
  });

  console.log(dm);
}
