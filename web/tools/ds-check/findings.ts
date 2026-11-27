/** Structured facts a finding's message carries, for the metrics and the review probe. */
import type { Finding } from "./types";

export type AnnotatedFinding = Finding & { element?: string; component?: string };

// Only tags with a design-system replacement; radio joins when libs/ui ships Radio.
const ELEMENTS = ["button", "select", "table", "checkbox"] as const;

/** Adds the raw element kind and the design-system component the message names, when it names one. */
export function annotate(finding: Finding): AnnotatedFinding {
  const out: AnnotatedFinding = { ...finding };
  const { rule, message } = finding;
  if (rule === "raw-control") {
    const element = ELEMENTS.find((e) => new RegExp(`raw (<${e}>|${e} input)`).test(message));
    if (element) out.element = element;
  }
  if (rule === "raw-control" || rule === "replaced-import" || rule === "deprecated-import") {
    const component = message.match(/(?:Use|import|use) ([A-Z]\w+) from @humansignal\/ui/)?.[1];
    if (component) out.component = component;
  }
  return out;
}
