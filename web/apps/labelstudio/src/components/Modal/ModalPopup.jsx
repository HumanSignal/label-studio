import React, { createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { LsCross } from "../../assets/icons";
import { BemWithSpecifiContext, cn } from "../../utils/bem";
import { aroundTransition } from "../../utils/transition";
import { Button } from "../Button/Button";
import "./Modal.scss";

const { Block, Elem } = BemWithSpecifiContext();

const ModalContext = createContext();

export class Modal extends React.Component {
  modalRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      title: props.title,
      body: props.body,
      footer: props.footer,
      visible: props.animateAppearance ? false : props.visible ?? false,
      transition: props.visible ? "visible" : null,
    };
  }

  componentDidMount() {
    if (this.props.animateAppearance) {
      setTimeout(() => this.show(), 30);
    }

    // with `allowToInterceptEscape` we can prevent closing modal on escape
    // by handling it inside modal, before event will be bubbled here
    document.addEventListener("keydown", this.closeOnEscape, { capture: !this.props.allowToInterceptEscape });
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.closeOnEscape, { capture: !this.props.allowToInterceptEscape });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.visible !== this.state.visible) {
      document.body.style.overflow = this.state.visible ? "hidden" : "";
    }
  }

  setBody(body) {
    this.setState({ body });
  }

  show(onShow) {
    return new Promise((resolve) => {
      this.setState({ visible: true }, async () => {
        onShow?.();
        this.props.onShow?.();
        await this.transition("appear", resolve);
      });
    });
  }

  hide(onHidden) {
    return new Promise((resolve) => {
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
    };

    const mixes = [this.transitionClass, this.props.className];

    const modalSizeStyle = {};

    if (this.props.width) modalSizeStyle.width = this.props.width;
    if (this.props.height) modalSizeStyle.height = this.props.height;

    const modalContent = (
      <ModalContext.Provider value={this}>
        <Block name="modal" ref={this.modalRef} mod={mods} mix={mixes} onClick={this.onClickOutside}>
          <Elem name="wrapper">
            <Elem name="content" style={Object.assign({}, this.props.style, modalSizeStyle)}>
              {!bare && (
                <Modal.Header>
                  <Elem name="title">{this.state.title}</Elem>
                  {this.props.allowClose !== false && <Elem tag={Button} name="close" type="text" icon={<LsCross />} />}
                </Modal.Header>
              )}
              <Elem name="body" mod={{ bare }}>
                {this.body}
              </Elem>
              {this.props.footer && <Modal.Footer bare={this.props.bareFooter}>{this.footer}</Modal.Footer>}
            </Elem>
          </Elem>
        </Block>
      </ModalContext.Provider>
    );

    return createPortal(modalContent, document.body);
  }

  onClickOutside = (e) => {
    if (!this.modalRef.current) return;
    const { closeOnClickOutside } = this.props;
    const allowClose = this.props.allowClose !== false;
    const isInModal = this.modalRef.current.contains(e.target);
    const content = cn("modal").elem("content").closest(e.target);
    const close = cn("modal").elem("close").closest(e.target);

    if (allowClose && ((isInModal && close) || (content === null && closeOnClickOutside !== false))) {
      this.hide();
    }
  };

  closeOnEscape = (e) => {
    if (this.props.allowClose === false) return;
    if (e.key !== "Escape") return;
    if (!this.state.visible) return;

    e.stopPropagation();
    e.preventDefault();
    this.hide();
  };

  transition(type, onFinish) {
    return aroundTransition(this.modalRef.current, {
      transition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: type }, () => {
            resolve();
          });
        }),
      beforeTransition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: `before-${type}` }, () => {
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
    if (this.state.body) {
      const Content = this.state.body;

      return Content instanceof Function ? <Content /> : Content;
    }
    return this.props.children;
  }

  get footer() {
    if (this.state.footer) {
      const Content = this.state.footer;

      return Content instanceof Function ? <Content /> : Content;
    }

    return null;
  }
}

Modal.Header = ({ children, divided }) => (
  <Elem name="header" mod={{ divided }}>
    {children}
  </Elem>
);

Modal.Footer = ({ children, bare }) => (
  <Elem name="footer" mod={{ bare }}>
    {children}
  </Elem>
);

export const useModalControls = () => {
  return useContext(ModalContext);
};
