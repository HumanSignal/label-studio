import { Component, createContext, createRef, type FC, useContext } from "react";
import { createPortal } from "react-dom";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { aroundTransition } from "@humansignal/core/lib/utils/transition";
import { setRef } from "@humansignal/core/lib/utils/unwrapRef";
import { Block, Elem } from "./ModalContext";
import { ModalBody } from "./ModalBody";
import { ModalCloseButton } from "./ModalCloseButton";
import { ModalFooter } from "./ModalFooter";
import { ModalHeader } from "./ModalHeader";
import { ModalTitle } from "./ModalTitle";

import "./Modal.scss";

const ModalContext = createContext<Modal | null>(null);

export type ModalProps<BP = unknown> = {
  children?: React.ReactNode;
  visible?: boolean;
  animateAppearance?: boolean;
  allowClose?: boolean;
  closeOnClickOutside?: boolean;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  body?: React.ReactNode | FC<BP>;
  bodyProps?: BP;
  bare?: boolean;
  bareFooter?: boolean;
  fullscreen?: boolean;
  optimize?: boolean;
  width?: string | number;
  height?: string | number;
  onShow?: () => void;
  onHide?: () => void;
  onExit?: () => void;
  allowToInterceptEscape?: boolean;
  style?: React.CSSProperties;
  className?: string;
  "data-testid"?: string;
  fullscreenSizeReduction?: number;
  rawClassName?: string;
};

type ModalState = {
  visible: boolean;
  transition: "visible" | "appear" | "before-appear" | "disappear" | "before-disappear" | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Modal<BP = unknown> extends Component<ModalProps<BP>, ModalState> {
  static Header = ModalHeader;
  static Footer = ModalFooter;
  static Title = ModalTitle;
  static Body = ModalBody;
  static CloseButton = ModalCloseButton;

  modalRef = createRef<HTMLElement>();

  constructor(props: ModalProps<BP>) {
    super(props);

    this.state = {
      visible: props.animateAppearance ? false : (props.visible ?? false),
      transition: props.visible ? "visible" : null,
    };
  }

  componentDidMount() {
    if (this.props.animateAppearance) {
      setTimeout(() => this.show(), 30);
    }

    // with `allowToInterceptEscape` we can prevent closing modal on escape
    // by handling it inside modal, before event will be bubbled here
    document.addEventListener("keydown", this.closeOnEscape, {
      capture: !this.props.allowToInterceptEscape,
    });
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.closeOnEscape, {
      capture: !this.props.allowToInterceptEscape,
    });
  }

  componentDidUpdate(prevProps: ModalProps<BP>, prevState: ModalState) {
    if (prevState.visible !== this.state.visible) {
      document.body.style.overflow = this.state.visible ? "hidden" : "";
    }
    if (isDefined(this.props.visible) && prevProps.visible !== this.props.visible) {
      this.props.visible ? this.show() : this.hide();
    }
  }

  show(onShow?: () => void) {
    return new Promise<void>((resolve) => {
      this.setState({ visible: true }, async () => {
        onShow?.();
        this.props.onShow?.();
        await this.transition("appear", resolve);
      });
    });
  }

  hide(onHidden?: () => void) {
    return new Promise<void>((resolve) => {
      this.transition("disappear", () => {
        this.setState({ visible: false }, () => {
          this.props.onHide?.();
          resolve();
          onHidden?.();
        });
      });
    });
  }

  render() {
    if (!this.state.visible) return null;

    const bare = this.props.bare;

    const mods = {
      fullscreen: !!this.props.fullscreen,
      bare: this.props.bare,
      visible: this.props.visible || this.state.visible,
      optimize: this.props.optimize ?? true,
    };
    const styles: Record<string, string | number> = {};

    const mixes = [this.transitionClass, this.props.className];

    const modalSizeStyle: React.CSSProperties = {};

    if (this.props.width) modalSizeStyle.width = this.props.width;
    if (this.props.height) modalSizeStyle.height = this.props.height;
    if (window?.APP_SETTINGS?.flags?.automax_enabled) {
      const fullscreenSizeReduction =
        mods.fullscreen && (this.props.fullscreenSizeReduction || this.props.fullscreenSizeReduction === 0)
          ? `${this.props.fullscreenSizeReduction}px`
          : "";
      if (fullscreenSizeReduction) {
        styles["--fullscreen-size-reduction"] = fullscreenSizeReduction;
        if (this.props.fullscreenSizeReduction === 0) {
          styles["--modal-border-radius"] = 0;
        }
      }
    }

    const modalContent = (
      <ModalContext.Provider value={this}>
        <Block
          name="modal-ls"
          ref={(el) => setRef(this.modalRef, el)}
          mod={mods}
          mix={mixes}
          onClick={this.onClickOutside}
          data-testid={this.props["data-testid"]}
          style={styles}
          rawClassName={this.props.rawClassName}
        >
          <Elem name="wrapper">
            <Elem name="content" style={Object.assign({}, this.props.style, modalSizeStyle)}>
              {!bare && (
                <ModalHeader>
                  <ModalTitle>{this.props.title}</ModalTitle>
                  {this.props.header && <Elem name="header-content">{this.props.header}</Elem>}
                  {this.props.allowClose !== false && <ModalCloseButton />}
                </ModalHeader>
              )}
              <ModalBody bare={bare}>{this.body}</ModalBody>
              {this.props.footer && <ModalFooter bare={this.props.bareFooter}>{this.footer}</ModalFooter>}
            </Elem>
          </Elem>
        </Block>
      </ModalContext.Provider>
    );

    return createPortal(modalContent, document.body);
  }

  onClickOutside = (e: React.MouseEvent) => {
    if (!this.modalRef.current) return;
    const { closeOnClickOutside } = this.props;
    const elem = e.target as HTMLElement;
    const allowClose = this.props.allowClose !== false;
    const isInModal = this.modalRef.current.contains(elem);
    const content = cn("modal-ls").elem("content").closest(elem);
    const close = cn("modal-ls").elem("close").closest(elem);

    if (allowClose && ((isInModal && close) || (content === null && closeOnClickOutside !== false))) {
      this.hide();
    }
  };

  closeOnEscape = (e: KeyboardEvent) => {
    if (this.props.allowClose === false) return;
    if (e.key !== "Escape") return;
    if (!this.state.visible) return;

    e.stopPropagation();
    e.preventDefault();
    this.hide(this.props.onExit);
  };

  transition(type: "visible" | "appear" | "disappear", onFinish: () => void) {
    if (!this.modalRef.current) return Promise.resolve();
    if (process.env.NODE_ENV === "test") {
      onFinish?.();
      return Promise.resolve();
    }

    return aroundTransition(this.modalRef.current, {
      transition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: type }, () => {
            resolve();
          });
        }),
      beforeTransition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: `before-${type as "appear" | "disappear"}` }, () => {
            resolve();
          });
        }),
      afterTransition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: type === "appear" ? "visible" : null }, () => {
            onFinish?.();
            resolve();
          });
        }),
    });
  }

  get transitionClass() {
    switch (this.state.transition) {
      case "before-appear":
        return "before-appear";
      case "appear":
        return "appear before-appear";
      case "before-disappear":
        return "before-disappear";
      case "disappear":
        return "disappear before-disappear";
      case "visible":
        return "visible";
    }
    return null;
  }

  get body() {
    if (this.props.body) {
      const Content = this.props.body;

      return Content instanceof Function ? <Content {...(this.props.bodyProps ?? {})} /> : Content;
    }
    return (this.props as ModalProps<BP>).children;
  }

  get footer() {
    if (this.props.footer) {
      const Content = this.props.footer;

      return Content instanceof Function ? <Content /> : Content;
    }

    return null;
  }

  get visible() {
    return this.state.visible;
  }
}

export const useModalControls = () => {
  const context = useContext(ModalContext);
  return context ?? null;
};
