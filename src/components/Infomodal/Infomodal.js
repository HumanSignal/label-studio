import { Modal } from "antd";

const wrapper = (_type, value, title) => {
  let custom = {
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

  custom.type({
    title: title ? title : custom.title,
    content: value,
  });
};

/**
 * Success modal
 * @param {string} value
 * @param {string} title
 */
const error = (value, title) => {
  wrapper(`error`, value, title);
};

/**
 * Warning modal
 * @param {string} value
 * @param {string} title
 */
const warning = (value, title) => {
  wrapper(`warning`, value, title);
};

/**
 * Success modal
 * @param {string} value
 * @param {string} title
 */
const success = (value, title) => {
  wrapper(`success`, value, title);
};

/**
 * Information modal
 * @param {string} value
 * @param {string} title
 */
const info = (value, title) => {
  wrapper(`info`, value, title);
};

export default { error, warning, success, info };
