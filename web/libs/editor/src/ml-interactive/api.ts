/**
 * Thin fetch helpers for the ML-backend capability discovery flow.
 *
 * Both helpers talk to the existing LS Django proxy, not the ML backend
 * directly — so no new Django routes are required for Phase 1. The
 * `capabilities` event reuses `/interactive-annotating`, which the SAM
 * backend now short-circuits before any task/control lookup.
 */

import type { Capabilities } from "./types";

const API_BASE = window.APP_SETTINGS?.hostname ?? "";

function getCsrfToken(): string {
  const match = document.cookie.split(";").find((c) => c.trim().startsWith("csrftoken="));
  return match ? match.trim().split("=")[1] : "";
}

export interface InteractiveBackendSummary {
  id: number;
  title?: string;
}

export async function fetchInteractiveBackends(projectId: number): Promise<InteractiveBackendSummary[]> {
  const res = await fetch(`${API_BASE}/api/ml/?project=${projectId}&is_interactive=true`);
  if (!res.ok) throw new Error(`Failed to fetch interactive ML backends: ${res.status}`);
  const data = await res.json();
  const list = data.results ?? data ?? [];
  return list.map((b: any) => ({ id: b.id, title: b.title }));
}

/**
 * Post `event: "capabilities"` to `/interactive-annotating` for one backend.
 *
 * The Django proxy requires a `task` id in the body (it loads the task and
 * forwards it to the ML backend). The backend's capability handler ignores
 * the task — it's purely a carrier. Pass any current task id from the view.
 */
export async function fetchCapabilities(backendId: number, taskId: number): Promise<Capabilities | null> {
  const res = await fetch(`${API_BASE}/api/ml/${backendId}/interactive-annotating`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify({ task: taskId, context: { event: "capabilities" } }),
  });
  if (!res.ok) throw new Error(`Failed to fetch ML backend capabilities: ${res.status}`);
  const data = await res.json();
  const value = data?.data?.result?.[0]?.value;
  if (!value || !Array.isArray(value.prompts) || !Array.isArray(value.targets)) return null;
  return value as Capabilities;
}
