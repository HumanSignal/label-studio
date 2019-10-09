/**
 * LS will render in this part
 */
function rootElement(element) {
  const el = document.createElement("div");

  let root = document.getElementById(element);

  root.innerHTML = "";
  root.appendChild(el);

  return el;
}

export default { rootElement };
