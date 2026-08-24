export type InfoModalVariant = "error" | "warning" | "success" | "info";

export interface InfoModalPayload {
  variant: InfoModalVariant;
  content: string;
  title: string;
}

type Apply = (value: InfoModalPayload | null) => void;

let apply: Apply | null = null;

export function registerInfoModalDispatch(setter: Apply | null) {
  apply = setter;
}

export function showInfoModal(payload: InfoModalPayload) {
  apply?.(payload);
}

export function hideInfoModal() {
  apply?.(null);
}
