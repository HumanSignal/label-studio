/**
 * Jest/RTL test harness for the LabelStudio editor.
 * Renders the editor with the same config/task/annotations pattern as Cypress LabelStudio.params().
 * Use for DOM-only and serialization tests without a real browser.
 */
import { render, screen } from "@testing-library/react";
import React from "react";
import defaultOptions from "../defaultOptions";
import { configureStore } from "../configureStore";
import App from "../components/App/App";

export type RenderEditorOptions = {
  config: string;
  task?: {
    id?: number;
    data?: Record<string, unknown>;
    annotations?: Array<{ id: number; result: unknown[] }>;
    predictions?: Array<{ id: number; result: unknown[] }>;
  };
  interfaces?: string[];
};

const defaultTask = {
  id: 1,
  data: {},
  annotations: [] as Array<{ id: number; result: unknown[] }>,
  predictions: [] as Array<{ id: number; result: unknown[] }>,
};

/**
 * Renders the LabelStudio editor with the given config and task.
 * Returns the store, container, RTL screen helpers, and a serialize() helper for the selected annotation.
 */
export async function renderEditor(options: RenderEditorOptions) {
  const { config, task = defaultTask, interfaces = defaultOptions.interfaces } = options;
  const params = {
    ...defaultOptions,
    config,
    interfaces,
    task: {
      ...defaultTask,
      ...task,
      annotations: task.annotations ?? defaultTask.annotations,
      predictions: task.predictions ?? defaultTask.predictions,
    },
  };

  const { store } = await configureStore(params);
  (window as Window & { Htx?: typeof store }).Htx = store;
  const container = document.createElement("div");
  document.body.appendChild(container);

  const result = render(<App store={store} />, { container });

  return {
    store,
    container,
    unmount: result.unmount,
    serialize: () => store.annotationStore.selected?.serializeAnnotation?.(),
    ...screen,
  };
}
