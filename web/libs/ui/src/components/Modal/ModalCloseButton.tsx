import { IconClose } from "@humansignal/icons";
import { Button } from "../Button";
import { useModalControls } from "./ModalPopup";

export const ModalCloseButton = () => {
  const modal = useModalControls();
  return (
    <Button
      look="text"
      size="compact"
      className="!p-0 [&_svg]:!w-6 [&_svg]:!h-6"
      icon={<IconClose />}
      aria-label="Close modal"
      onClick={() => modal?.hide()}
    />
  );
};
