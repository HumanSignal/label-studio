/**
 * Classic editor (MST) ViewAllToggle wrapper.
 *
 * The visual + accessibility contract lives in `@humansignal/core/lib/topbar`. This
 * file is the only place MobX runs — it's a `pass-through` wrapper that keeps the
 * existing MST-driven props/API stable so the rest of the editor doesn't need to
 * change.
 */
import { observer } from "mobx-react";
import { ViewAllToggle as SharedViewAllToggle } from "@humansignal/core";

interface ViewAllToggleProps {
  isActive: boolean;
  onClick: () => void;
}

export const ViewAllToggle = observer(({ isActive, onClick }: ViewAllToggleProps) => {
  return <SharedViewAllToggle isActive={isActive} onClick={onClick} />;
});
