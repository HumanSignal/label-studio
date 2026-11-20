import { showInfoModal } from "./infomodal-dispatch";

const DEFAULT_TITLES = {
  error: "Error",
  warning: "Warning",
  success: "Success",
  info: "Info",
};

const VARIANTS = ["error", "warning", "success", "info"];

const wrapper = (_type, value, title) => {
  const variant = VARIANTS.includes(_type) ? _type : "info";
  showInfoModal({
    variant,
    content: value,
    title: title ? title : DEFAULT_TITLES[variant],
  });
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
