// import '@heartex/datamanager/build/static/css/main.css';
import { DataManager } from "../../dm/js/main";

const dmRoot = document.querySelector(".datamanager");

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
    apiGateway: "../api",

  });

  console.log(dm);
}
