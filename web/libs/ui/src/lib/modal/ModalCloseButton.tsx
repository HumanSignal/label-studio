import { IconClose } from "@humansignal/icons";
import { Button } from "../button/button";
import { useModalControls } from "./ModalPopup";

export const ModalCloseButton = () => {
  const modal = useModalControls();

  // Only the legacy Modal provides this context. Anywhere else this button does nothing.
  if (!modal && process.env.NODE_ENV !== "production") {
    console.error("Modal.CloseButton rendered outside a legacy Modal: it cannot close anything.");
  }
  return (
    <Button
      look="ghost"
      className="!p-0 [&_svg]:!w-6 [&_svg]:!h-6"
      leading={<IconClose />}
      aria-label="Close modal"
      onClick={() => modal?.hide()}
    />
  );
};
