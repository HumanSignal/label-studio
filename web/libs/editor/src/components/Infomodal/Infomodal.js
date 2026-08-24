import { Modal } from "antd";
import * as ff from "@humansignal/core/lib/utils/feature-flags";
import { showInfoModal } from "./infomodal-dispatch";

const DEFAULT_TITLES = {
  error: "Error",
  warning: "Warning",
  success: "Success",
  info: "Info",
};

const VARIANTS = ["error", "warning", "success", "info"];

const legacyWrapper = (_type, value, title) => {
  const custom = {
    type: "",
    title: "",
  };

  switch (_type) {
    case "error":
      custom.type = Modal.error;
      custom.title = "Error";
      break;
    case "warning":
      custom.type = Modal.warning;
      custom.title = "Warning";
      break;
    case "success":
      custom.type = Modal.success;
      custom.title = "Success";
      break;
    default:
      custom.type = Modal.info;
      custom.title = "Info";
  }

  return custom.type({
    title: title ? title : custom.title,
    content: value,
  });
};

const wrapper = (_type, value, title) => {
  if (ff.isActive(ff.FF_MODAL_WINDOW_APP_CHROME)) {
    const variant = VARIANTS.includes(_type) ? _type : "info";
    showInfoModal({
      variant,
      content: value,
      title: title ? title : DEFAULT_TITLES[variant],
    });
    return;
  }
  return legacyWrapper(_type, value, title);
};

/**
 * Success modal
 * @param {string} value
 * @param {string} title
 */
const error = (value, title) => {
  return wrapper("error", value, title);
};

/**
 * Warning modal
 * @param {string} value
 * @param {string} title
 */
const warning = (value, title) => {
  return wrapper("warning", value, title);
};

/**
 * Success modal
 * @param {string} value
 * @param {string} title
 */
const success = (value, title) => {
  return wrapper("success", value, title);
};

/**
 * Information modal
 * @param {string} value
 * @param {string} title
 */
const info = (value, title) => {
  return wrapper("info", value, title);
};

export default { error, warning, success, info };
