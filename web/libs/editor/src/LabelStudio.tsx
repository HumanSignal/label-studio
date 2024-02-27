import { configure } from 'mobx';
import { destroy } from 'mobx-state-tree';
import { render, unmountComponentAtNode } from 'react-dom';
import { toCamelCase } from 'strman';

import { LabelStudio as LabelStudioReact } from './Component';
import App from './components/App/App';
import { configureStore } from './configureStore';
import legacyEvents from './core/External';
import { Hotkey } from './core/Hotkey';
import defaultOptions from './defaultOptions';
import { destroy as destroySharedStore } from './mixins/SharedChoiceStore/mixin';
import { EventInvoker } from './utils/events';
import { FF_LSDV_4620_3_ML, isFF } from './utils/feature-flags';
import { cleanDomAfterReact, findReactKey } from './utils/reactCleaner';
import { isDefined } from './utils/utilities';

declare global {
  interface Window { Htx: any }
}

configure({
  isolateGlobalState: true,
});

type Callback = (...args: any[]) => any;

type LSFUser = any;
type LSFTask = any;

// @todo type LSFOptions = SnapshotIn<typeof AppStore>;
// because those options will go as initial values for AppStore
// but it's not types yet, so here is some excerpt of its params
type LSFOptions = Record<string, any> & {
  interfaces: string[],
  keymap: Keymap,
  user: LSFUser,
  users: LSFUser[],
  task: LSFTask,
}

export class LabelStudio {
  static Component = LabelStudioReact;

  static instances = new Set<LabelStudio>();

  static destroyAll() {
    this.instances.forEach(inst => inst.destroy?.());
    this.instances.clear();
  }

  options: Partial<LSFOptions>;
  root: Element | string;
  store: any;

  destroy: (() => void) | null = () => {};
  events = new EventInvoker();

  getRootElement(root: Element | string) {
    let element: Element | null = null;

    if (typeof root === 'string') {
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

    this.supportLegacyEvents();
    this.createApp();

    LabelStudio.instances.add(this);
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

  async createApp() {
    const { store } = await configureStore(this.options, this.events);
    const rootElement = this.getRootElement(this.root);

    this.store = store;
    window.Htx = this.store;

    const isRendered = false;

    const renderApp = () => {
      if (isRendered) {
        clearRenderedApp();
      }
      render((
        <App store={this.store} />
      ), rootElement);
    };

    const clearRenderedApp = () => {
      if (!rootElement.childNodes?.length) return;

      const childNodes = [...rootElement.childNodes];
      // cleanDomAfterReact needs this key to be sure that cleaning affects only current react subtree
      const reactKey = findReactKey(childNodes[0]);

      unmountComponentAtNode(rootElement);
      /*
        Unmounting doesn't help with clearing React's fibers
        but removing the manually helps
        @see https://github.com/facebook/react/pull/20290 (similar problem)
        That's maybe not relevant in version 18
       */
      cleanDomAfterReact(childNodes, reactKey);
      cleanDomAfterReact([rootElement], reactKey);
    };

    renderApp();
    store.setAppControls({
      isRendered() {
        return isRendered;
      },
      render: renderApp,
      clear: clearRenderedApp,
    });

    this.destroy = () => {
      if (isFF(FF_LSDV_4620_3_ML)) {
        clearRenderedApp();
      }
      destroySharedStore();
      if (isFF(FF_LSDV_4620_3_ML)) {
        /*
           It seems that destroying children separately helps GC to collect garbage
           ...
         */
        this.store.selfDestroy();
      }
      destroy(this.store);
      if (isFF(FF_LSDV_4620_3_ML)) {
        /*
            ...
            as well as nulling all these this.store
         */
        this.store = null;
        this.destroy = null;
        LabelStudio.instances.delete(this);
      }
    };
  }

  supportLegacyEvents() {
    const keys = Object.keys(legacyEvents);

    keys.forEach(key => {
      const callback = this.options[key];

      if (isDefined(callback)) {
        const eventName = toCamelCase(key.replace(/^on/, ''));

        this.events.on(eventName, callback);
      }
    });
  }
}
