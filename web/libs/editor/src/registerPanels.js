import { inject, observer } from 'mobx-react';

export const registerPanels = (panels = []) => {
  return panels.map(panel => ({
    ...panel,
    Component: panel.builder({ inject, observer }),
  }));
};
