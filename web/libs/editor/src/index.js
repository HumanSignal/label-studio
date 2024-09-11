import "./core/feature-flags";
import "./assets/styles/global.scss";
import { LabelStudio } from "./LabelStudio";

if (process.env.NODE_ENV !== "production") {
  // Set access to LabelStudio for testing
  // console.warn when accessing
  window.LabelStudio = new Proxy(LabelStudio, {
    construct(target, args) {
      console.warn("Accessing window.LabelStudio constructor");
      return new target(...args);
    },
    get(target, prop) {
      console.warn(`Accessing window.LabelStudio property: ${prop}`);
      return target[prop];
    },
  });
}

export default LabelStudio;

export { LabelStudio };
