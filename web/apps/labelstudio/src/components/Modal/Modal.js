import React, { createRef } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { ApiProvider } from "../../providers/ApiProvider";
import { ConfigProvider } from "../../providers/ConfigProvider";
import { CurrentUserProvider } from "../../providers/CurrentUser";
import { MultiProvider } from "../../providers/MultiProvider";
import { cn } from "../../utils/bem";
import { Button } from "../Button/Button";
import { Space } from "../Space/Space";
import { Modal } from "./ModalPopup";

const standaloneModal = (props) => {
  const modalRef = createRef();
  const rootDiv = document.createElement("div");
  let renderCount = 0;
  rootDiv.className = cn("modal-holder").toClassName();

  document.body.appendChild(rootDiv);

  const renderModal = (props, animate) => {
    renderCount++;

    // simple modals don't require any parts of the app and can't cause the loop of death
    render(
      <MultiProvider
        key={`modal-${renderCount}`}
        providers={
          props.simple
            ? []
            : [<ConfigProvider key="config" />, <ApiProvider key="api" />, <CurrentUserProvider key="current-user" />]
        }
      >
        <Modal
          ref={modalRef}
          {...props}
          onHide={() => {
            props.onHidden?.();
            unmountComponentAtNode(rootDiv);
            rootDiv.remove();
          }}
          animateAppearance={animate}
        />
      </MultiProvider>,
      rootDiv,
    );
  };

  renderModal(props, true);

  return {
    update(newProps) {
      renderModal({ ...props, ...(newProps ?? {}), visible: true }, false);
    },
    close() {
      const result = modalRef.current.hide();
      unmountComponentAtNode(rootDiv);
      rootDiv.remove();
      return result;
    },
  };
};

export const confirm = ({ okText, onOk, cancelText, onCancel, buttonLook, ...props }) => {
  const modal = standaloneModal({
    ...props,
    allowClose: false,
    footer: (
      <Space align="end">
        <Button
          onClick={() => {
            onCancel?.();
            modal.close();
          }}
          size="compact"
          autoFocus
        >
          {cancelText ?? "Cancel"}
        </Button>

        <Button
          onClick={() => {
            onOk?.();
            modal.close();
          }}
          size="compact"
          look={buttonLook ?? "primary"}
        >
          {okText ?? "OK"}
        </Button>
      </Space>
    ),
  });

  return modal;
};

export const info = ({ okText, onOkPress, ...props }) => {
  const modal = standaloneModal({
    ...props,
    footer: (
      <Space align="end">
        <Button
          onClick={() => {
            onOkPress?.();
            modal.close();
          }}
          look="primary"
          size="compact"
        >
          {okText ?? "OK"}
        </Button>
      </Space>
    ),
  });

  return modal;
};

export { standaloneModal as modal };
export { Modal };

Object.assign(Modal, {
  info,
  confirm,
  modal: standaloneModal,
});
