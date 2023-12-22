import { Component } from "react";
import ReactDOM from "react-dom";

export class LabelButtons extends Component {
  state = {
    element: null,
  };

  /** @type {MutationObserver} */
  observer = null;

  componentDidMount() {
    const target = this.target;

    if (target) {
      this.updateElement(target);
    }
  }

  componentDidUpdate() {
    if (!this.observer && this.target) {
      const target = this.target;

      this.observer = new MutationObserver(() => {
        this.updateElement(target);
      });

      this.observer.observe(target, {
        childList: true,
        subtree: true,
      });

      this.updateElement(target);
    }
  }

  componentWillUnmount() {
    this.setState({ element: null });
    this.observer.disconnect();
  }

  render() {
    const { children } = this.props;
    const { element } = this.state;

    return element ? ReactDOM.createPortal(children, element) : null;
  }

  updateElement(target) {
    const panel = target.querySelector(".ls-panel");

    if (panel && !this.isConnected) {
      this.createButtonsWrapper(panel);
    } else if (panel === undefined) {
      this.setState({ element: null });
    }
  }

  /**
   * Create a wrapper for the portal
   * @param {HTMLElement} root
   */
  createButtonsWrapper(root) {
    /** @type {HTMLElement} */
    const child = root.childNodes[0];
    const className = child.getAttribute("class");

    const wrapper = document.createElement("div");

    wrapper.setAttribute("class", className);

    child.after(wrapper);
    this.setState({ element: wrapper });
  }

  get target() {
    return this.props.root.current;
  }

  get isConnected() {
    return this.state.element?.isConnected === true;
  }
}
