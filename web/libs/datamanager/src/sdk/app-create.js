/** @typedef {{
 * views?: any[]
 * }} AppOptions */

import React from "react";
import ReactDOM from "react-dom";
import { App } from "../components/App/App";
import { AppStore } from "../stores/AppStore";
import * as DataStores from "../stores/DataStores";
import { registerModel } from "../stores/DynamicModel";

const createDynamicModels = (columns) => {
  const grouppedColumns = columns.reduce((res, column) => {
    res.set(column.target, res.get(column.target) ?? []);
    res.get(column.target).push(column);
    return res;
  }, new Map());

  grouppedColumns.forEach((columns, target) => {
    const dataStore = DataStores[target].create?.(columns);

    if (dataStore) registerModel(`${target}Store`, dataStore);
  });

  if (columns.length === 0) {
    registerModel("tasksStore", DataStores.tasks?.create());
  }

  /** temporary solution until we'll have annotations */
  registerModel("annotationsStore", DataStores.annotations?.create());
};

/**
 * Create DM React app
 * @param {HTMLElement} rootNode
 * @param {import("./dm-sdk").DataManager} datamanager
 * @returns {Promise<AppStore>}
 */
export const createApp = async (rootNode, datamanager) => {
  const isLabelStream = datamanager.mode === "labelstream";

  const response = await datamanager.api.columns();

  if (!response || response.error) {
    const message = `
      ${response?.error ?? ""}
      LS API not available; check \`API_GATEWAY\` and \`LS_ACCESS_TOKEN\` env vars;
      also check \`data-project-id\` in \`public/index.html\`
    `;

    throw new Error(message);
  }

  const columns = response.columns ?? (Array.isArray(response) ? response : []);

  createDynamicModels(columns);

  const appStore = AppStore.create({
    viewsStore: {
      views: [],
      columnsRaw: columns,
    },
    project: datamanager.project ?? {},
    mode: datamanager.mode,
    showPreviews: datamanager.showPreviews,
    interfaces: Object.fromEntries(datamanager.interfaces),
    toolbar: datamanager.toolbar,
    availableActions: Array.from(datamanager.actions.values()).map(({ action }) => action),
  });

  appStore._sdk = datamanager;

  appStore.fetchData({ isLabelStream });

  window.DM = appStore;

  ReactDOM.render(<App app={appStore} />, rootNode);

  return appStore;
};
