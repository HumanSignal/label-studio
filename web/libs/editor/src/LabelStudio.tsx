import { configure } from "mobx";
import { destroy } from "mobx-state-tree";
import { render } from "react-dom";
import { createRoot } from "react-dom/client";
import { camelCase } from "@humansignal/core/lib/utils/string";
import { LabelStudio as LabelStudioReact } from "./Component";
import App from "./components/App/App";
import { configureStore } from "./configureStore";
import legacyEvents from "./core/External";
import { Hotkey } from "./core/Hotkey";
import defaultOptions from "./defaultOptions";
import { destroy as destroySharedStore } from "./mixins/SharedChoiceStore/mixin";
import { EventInvoker } from "./utils/events";
import { isDefined } from "./utils/utilities";

// Extend window interface for TypeScript
declare global {
  interface Window {
    Htx: any;
  }
}

configure({
  isolateGlobalState: true,
});

type Callback = (...args: any[]) => any;

type LSFUser = any;
type LSFTask = any;

// @todo type LSFOptions = SnapshotIn<typeof AppStore>;
// because those options will go as initial values for AppStore
// but it's not types yet, so here is some excerpt of its parameters
type LSFOptions = Record<string, any> & {
  interfaces: string[];
  keymap?: any;
  user?: LSFUser;
  users?: LSFUser[];
  task?: LSFTask;
  settings?: {
    forceBottomPanel?: boolean;
  };
  instanceOptions?: {
    reactVersion?: "v18" | "v17";
  };
};

export class LabelStudio {
  static Component = LabelStudioReact;

  static instances = new Set<LabelStudio>();

  static destroyAll() {
    LabelStudio.instances.forEach((inst) => inst.destroy?.());
    LabelStudio.instances.clear();
  }

  options: Partial<LSFOptions>;
  root: Element | string;
  store: any;
  reactRoot: any;

  destroy: (() => void) | null = () => {};
  events = new EventInvoker();

  getRootElement(root: Element | string) {
    let element: Element | null = null;

    if (typeof root === "string") {
      element = document.getElementById(root);
    } else {
      element = root;
    }

    if (!element) {
      throw new Error(`Root element not found (selector: ${root})`);
    }

    return element;
  }

  constructor(root: Element | string, userOptions: Partial<LSFOptions> = {}) {
    const options = { ...defaultOptions, ...userOptions };

    if (options.keymap) {
      Hotkey.setKeymap(options.keymap);
    }

    this.root = root;
    this.options = options;
    if (options.instanceOptions?.reactVersion === "v18") {
      this.createAppV18();
    } else {
      this.createAppV17();
    }

    // @todo whole approach to hotkeys should be rewritten,
    // @todo but for now we need a way to export Hotkey to different app
    if (window.Htx) window.Htx.Hotkey = Hotkey;

    this.supportLegacyEvents();

    if (options.instanceOptions?.reactVersion !== "v18") {
      LabelStudio.instances.add(this);
    }
  }

  on(eventName: string, callback: Callback) {
    this.events.on(eventName, callback);
  }

  off(eventName: string, callback: Callback) {
    if (isDefined(callback)) {
      this.events.off(eventName, callback);
    } else {
      this.events.removeAll(eventName);
    }
  }

  // This is a temporary solution that allows React 17 to work in the meantime.
  // and we can update our other usages of LabelStudio to use createRoot, namely tests will likely be affected.
  async createAppV17() {
    const { store } = await configureStore(this.options, this.events);
    const rootElement = this.getRootElement(this.root);

    this.store = store;
    window.Htx = this.store;

    const renderApp = () => {
      render(<App store={this.store} />, rootElement);
    };

    renderApp();

    this.destroy = () => {
      destroySharedStore();
      window.Htx = null;
      destroy(this.store);
      Hotkey.unbindAll();
      this.store = null;
      this.destroy = null;
      LabelStudio.instances.delete(this);
    };
  }

  // To support React 18 properly, we need to use createRoot
  // and render the app with it, and properly unmount it and cleanup all references
  async createAppV18() {
    const { store } = await configureStore(this.options, this.events);
    const rootElement = this.getRootElement(this.root);

    this.store = store;
    window.Htx = this.store;

    let isRendered = false;

    const renderApp = () => {
      if (isRendered) {
        clearRenderedApp();
      }
      this.reactRoot = createRoot(rootElement);
      const AppComponent = App as any;
      this.reactRoot.render(<AppComponent store={this.store} />);
      isRendered = true;
    };

    const clearRenderedApp = () => {
      if (this.reactRoot && isRendered) {
        this.reactRoot.unmount();
        this.reactRoot = null;
        isRendered = false;
      }
    };

    renderApp();

    this.destroy = () => {
      // Clear rendered app
      clearRenderedApp();

      // Destroy shared store
      destroySharedStore();

      // Destroy store
      destroy(this.store);

      // Unbind all hotkeys
      Hotkey.unbindAll();

      // Clear references
      this.store = null;
      window.Htx = null;
      this.destroy = null;
    };
  }

  supportLegacyEvents() {
    const keys = Object.keys(legacyEvents);

    keys.forEach((key) => {
      const callback = this.options[key];

      if (isDefined(callback)) {
        const eventName = camelCase(key.replace(/^on/, ""));

        this.events.on(eventName, callback);
      }
    });
  }
}
