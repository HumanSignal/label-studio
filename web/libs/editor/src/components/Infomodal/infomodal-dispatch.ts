export type InfoModalVariant = "error" | "warning" | "success" | "info";

export interface InfoModalPayload {
  variant: InfoModalVariant;
  content: string;
  title: string;
}

export interface ConfirmModalPayload {
  title: string;
  content: string;
  okText?: string;
  onOk: () => void;
}

type Apply = (value: InfoModalPayload | null) => void;
type ApplyConfirm = (value: ConfirmModalPayload | null) => void;

let apply: Apply | null = null;
let applyConfirm: ApplyConfirm | null = null;

export function registerInfoModalDispatch(setter: Apply | null) {
  apply = setter;
}

export function registerConfirmModalDispatch(setter: ApplyConfirm | null) {
  applyConfirm = setter;
}

export function showInfoModal(payload: InfoModalPayload) {
  apply?.(payload);
}

export function hideInfoModal() {
  apply?.(null);
}

/** Asks for confirmation in the editor's dialog; `onOk` runs only when the user confirms. */
export function showConfirmModal(payload: ConfirmModalPayload) {
  applyConfirm?.(payload);
}
