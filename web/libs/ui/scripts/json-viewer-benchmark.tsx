/**
 * Benchmark JsonViewer library candidates on Task Source fixtures.
 *
 * Usage (from services/lso/web):
 *   BUN_CONFIG=libs/ui/scripts/benchmark.bunfig.toml bun libs/ui/scripts/json-viewer-benchmark.tsx
 *
 * Outputs JSON to stdout and writes libs/ui/src/lib/json-viewer/benchmark-results.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import { JsonEditor } from "json-edit-react";
import { VirtualizeJSON } from "react-json-virtualization";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../src/lib/json-viewer/__fixtures__");
const RESULTS_PATH = path.resolve(__dirname, "../src/lib/json-viewer/benchmark-results.json");

const FIXTURE_FILES = ["large-task-source-10kb.json", "large-task-source-100kb.json", "large-task-source-1mb.json"];

const WARMUP_RUNS = 1;
const MEASURED_RUNS = 3;
const VIEWPORT_HEIGHT = 500;

type BenchmarkRow = {
  library: string;
  fixture: string;
  mountMs: { min: number; max: number; median: number; samples: number[] };
  domNodes: number;
  notes?: string;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function countDomNodes(element: Element | null): number {
  if (!element) return 0;
  let count = 1;
  for (const child of element.children) {
    count += countDomNodes(child);
  }
  return count;
}

function setupDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
  const { window } = dom;
  // @ts-expect-error test harness globals
  globalThis.window = window;
  // @ts-expect-error test harness globals
  globalThis.document = window.document;
  // @ts-expect-error test harness globals
  globalThis.navigator = window.navigator;
  // @ts-expect-error test harness globals
  globalThis.HTMLElement = window.HTMLElement;
  // @ts-expect-error test harness globals
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // react-json-virtualization measures viewport via ResizeObserver
  // @ts-expect-error jsdom polyfill
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  return { container: window.document.getElementById("root")! };
}

async function measureMount(
  label: string,
  renderFn: (container: HTMLElement) => { unmount: () => void },
): Promise<{ mountMs: number; domNodes: number }> {
  const { container } = setupDom();
  const start = performance.now();
  let unmount = () => {};

  await act(async () => {
    unmount = renderFn(container).unmount;
  });

  const mountMs = performance.now() - start;
  const domNodes = countDomNodes(container);
  unmount();
  return { mountMs, domNodes };
}

async function benchmarkLibrary(
  library: string,
  fixtureName: string,
  data: unknown,
  renderFactory: (data: unknown, container: HTMLElement) => { unmount: () => void },
): Promise<BenchmarkRow> {
  const samples: number[] = [];
  let domNodes = 0;

  for (let i = 0; i < WARMUP_RUNS + MEASURED_RUNS; i++) {
    const { mountMs, domNodes: nodes } = await measureMount(library, (container) => renderFactory(data, container));
    if (i >= WARMUP_RUNS) {
      samples.push(Math.round(mountMs * 100) / 100);
      domNodes = nodes;
    }
  }

  return {
    library,
    fixture: fixtureName,
    mountMs: {
      min: Math.min(...samples),
      max: Math.max(...samples),
      median: median(samples),
      samples,
    },
    domNodes,
  };
}

function renderJsonEditReact(data: unknown, container: HTMLElement) {
  const root = createRoot(container);
  root.render(
    <div style={{ height: VIEWPORT_HEIGHT, overflow: "auto" }}>
      <JsonEditor data={data} restrictEdit restrictDelete restrictAdd collapse={2} />
    </div>,
  );
  return {
    unmount: () => {
      act(() => root.unmount());
    },
  };
}

function renderJsonVirtualization(data: unknown, container: HTMLElement) {
  const json = JSON.stringify(data);
  const root = createRoot(container);
  root.render(
    <div style={{ height: VIEWPORT_HEIGHT }}>
      <VirtualizeJSON.Collapsable json={json} metadata height={VIEWPORT_HEIGHT} initialExpandDepth={2} />
    </div>,
  );
  return {
    unmount: () => {
      act(() => root.unmount());
    },
  };
}

const results: BenchmarkRow[] = [];

for (const fixtureFile of FIXTURE_FILES) {
  const raw = await readFile(path.join(FIXTURES_DIR, fixtureFile), "utf8");
  const data = JSON.parse(raw);

  results.push(
    await benchmarkLibrary("json-edit-react", fixtureFile, data, renderJsonEditReact),
    await benchmarkLibrary("react-json-virtualization", fixtureFile, data, renderJsonVirtualization),
  );
}

const output = {
  generatedAt: new Date().toISOString(),
  environment: {
    runtime: `Bun ${Bun.version}`,
    viewportHeight: VIEWPORT_HEIGHT,
    initialExpandDepth: 2,
    warmupRuns: WARMUP_RUNS,
    measuredRuns: MEASURED_RUNS,
    note: "jsdom mount benchmark — approximates initial render cost; scroll perf validated manually in spike doc.",
  },
  results,
};

await mkdir(path.dirname(RESULTS_PATH), { recursive: true });
await writeFile(RESULTS_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
