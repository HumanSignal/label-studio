import { inject, observer } from "mobx-react";

const injector = inject(({ store }) => {
  return {
    interfaces: store.interfaces,
  };
});

export const Interface = injector(
  observer(({ name, interfaces, children }) => {
    return interfaces.get(name) === true ? children : null;
  }),
);
