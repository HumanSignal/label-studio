import { Component, createContext, createRef, type FC, useContext } from "react";
import { createPortal } from "react-dom";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { aroundTransition } from "@humansignal/core/lib/utils/transition";
import { setRef } from "@humansignal/core/lib/utils/unwrapRef";
import { ModalBody } from "./ModalBody";
import { ModalCloseButton } from "./ModalCloseButton";
import { ModalFooter } from "./ModalFooter";
import { ModalHeader } from "./ModalHeader";
import { ModalTitle } from "./ModalTitle";

import "./Modal.prefix.css";

const ModalContext = createContext<Modal | null>(null);

function skipCssTransitionWait(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  // LSO bun unit CI sets NODE_ENV=development; bun --dom still uses jsdom, which never emits transitionend.
  return typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
}

/**
 * Every currently visible modal, in the order it became visible.
 *
 * Escape is a document-level listener per modal, so a dialog opened from inside another used to close
 * both — and since the opener is a portal sibling, not a DOM ancestor, the nested dialog's
 * `stopPropagation` could not save it. Only one modal may act on an Escape now: the innermost one, and
 * among equals the one opened last.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const openModals = new Set<Modal<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasOpenDescendant(modal: Modal<any>): boolean {
  for (const open of openModals) {
    if (open === modal) continue;
    for (let ancestor = open.parentModal; ancestor; ancestor = ancestor.parentModal) {
      if (ancestor === modal) return true;
    }
  }
  return false;
}

/**
 * The one modal an Escape belongs to.
 *
 * Nesting comes first and is read from the modal tree, not from open order: React mounts children
 * before parents, so a report rendering an already-visible dialog registers *after* it. Dialogs that are
 * merely siblings (a confirm raised from inside another dialog) have no such relationship, so among
 * those the most recently opened wins.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function escapeTarget(): Modal<any> | null {
  let target = null;
  for (const open of openModals) {
    if (!hasOpenDescendant(open)) target = open;
  }
  return target;
}

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

/**
 * Legacy modal implementation (portal + modal-ls styles).
 *
 * @deprecated For app chrome modals, prefer `ModalWindow`. `confirm` / `info` flows still use this class internally.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Modal<BP = unknown> extends Component<ModalProps<BP>, ModalState> {
  static Header = ModalHeader;
  static Footer = ModalFooter;
  static Title = ModalTitle;
  static Body = ModalBody;
  static CloseButton = ModalCloseButton;

  static contextType = ModalContext;
  declare context: React.ContextType<typeof ModalContext>;

  modalRef = createRef<HTMLDivElement>();
  mouseDownTarget: HTMLElement | null = null;
  /** The modal this one was opened from, if any. Read from context, so it survives the body portal. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentModal: Modal<any> | null = null;

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

    this.parentModal = this.context ?? null;
    if (this.state.visible) openModals.add(this);

    // with `allowToInterceptEscape` we can prevent closing modal on escape
    // by handling it inside modal, before event will be bubbled here
    document.addEventListener("keydown", this.closeOnEscape, {
      capture: !this.props.allowToInterceptEscape,
    });
  }

  componentWillUnmount() {
    openModals.delete(this);
    document.removeEventListener("keydown", this.closeOnEscape, {
      capture: !this.props.allowToInterceptEscape,
    });
  }

  componentDidUpdate(prevProps: ModalProps<BP>, prevState: ModalState) {
    if (prevState.visible !== this.state.visible) {
      if (this.state.visible) openModals.add(this);
      else openModals.delete(this);
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

    const blockClassName = [
      cn("modal-ls").mod(mods).mix(this.transitionClass, this.props.className).toClassName(),
      this.props.rawClassName,
    ]
      .filter(Boolean)
      .join(" ");

    const modalContent = (
      <ModalContext.Provider value={this}>
        <div
          ref={(el) => setRef(this.modalRef, el)}
          className={blockClassName}
          onMouseDown={this.onMouseDown}
          onClick={this.onClickOutside}
          data-testid={this.props["data-testid"]}
          style={styles}
        >
          <div className={cn("modal-ls").elem("wrapper").toClassName()}>
            <div
              className={cn("modal-ls").elem("content").toClassName()}
              style={Object.assign({}, this.props.style, modalSizeStyle)}
            >
              {!bare && (
                <ModalHeader>
                  <ModalTitle>{this.props.title}</ModalTitle>
                  {this.props.header && (
                    <div className={cn("modal-ls").elem("header-content").toClassName()}>{this.props.header}</div>
                  )}
                  {this.props.allowClose !== false && <ModalCloseButton />}
                </ModalHeader>
              )}
              <ModalBody bare={bare}>{this.body}</ModalBody>
              {this.props.footer && <ModalFooter bare={this.props.bareFooter}>{this.footer}</ModalFooter>}
            </div>
          </div>
        </div>
      </ModalContext.Provider>
    );

    return createPortal(modalContent, document.body);
  }

  onMouseDown = (e: React.MouseEvent) => {
    this.mouseDownTarget = e.target as HTMLElement;
  };

  onClickOutside = (e: React.MouseEvent) => {
    if (!this.modalRef.current) return;
    const { closeOnClickOutside } = this.props;
    const elem = e.target as HTMLElement;
    const allowClose = this.props.allowClose !== false;
    const isInModal = this.modalRef.current.contains(elem);
    const content = cn("modal-ls").elem("content").closest(elem);
    const close = cn("modal-ls").elem("close").closest(elem);

    // Every modal portals its overlay to document.body, so a modal opened from INSIDE this one is a DOM
    // sibling rather than a descendant — but React still routes its clicks here through the component
    // tree. Without this guard a click on the nested dialog's backdrop read as "outside my content" and
    // closed this modal too, taking the nested one down with it. The overlay is a full-viewport fixed
    // layer, so a click the user aimed at this modal (backdrop, wrapper, content, or close button) always
    // lands inside it; anything else came from another portal and is not ours to act on.
    if (!isInModal) {
      this.mouseDownTarget = null;
      return;
    }

    // Don't close if mousedown started inside content (e.g., text selection dragged outside)
    const mouseDownContent = this.mouseDownTarget ? cn("modal-ls").elem("content").closest(this.mouseDownTarget) : null;
    if (mouseDownContent && content === null) {
      this.mouseDownTarget = null;
      return;
    }

    if (allowClose && ((isInModal && close) || (content === null && closeOnClickOutside !== false))) {
      this.hide();
    }
    this.mouseDownTarget = null;
  };

  closeOnEscape = (e: KeyboardEvent) => {
    if (this.props.allowClose === false) return;
    if (e.key !== "Escape") return;
    if (!this.state.visible) return;
    // A dialog opened from inside this one is a portal sibling, so its Escape would otherwise close both.
    if (escapeTarget() !== this) return;

    e.stopPropagation();
    e.preventDefault();
    this.hide(this.props.onExit);
  };

  transition(type: "visible" | "appear" | "disappear", onFinish: () => void) {
    if (!this.modalRef.current || skipCssTransitionWait()) {
      // Without this, hide() waits for a CSS transitionend that jsdom never fires, so onHide never runs.
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
