/** CM5 react-codemirror2 props that must not be forwarded to @uiw/react-codemirror. */
const CM5_ONLY_PROP_KEYS = new Set([
  "extensions",
  "detach",
  "autoCloseTags",
  "smartIndent",
  "controlled",
  "border",
  "value",
  "options",
  "onBeforeChange",
  "onChange",
  "onKeyDown",
  "onCursorActivity",
  "onViewportChange",
  "onGutterClick",
  "onFocus",
  "onBlur",
  "onScroll",
  "onSelection",
  "editorDidMount",
  "editorWillUnmount",
  "cursor",
  "selection",
]);

export function pickCm6WrapperProps<T extends Record<string, unknown>>(props: T) {
  const wrapper: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (CM5_ONLY_PROP_KEYS.has(key)) continue;
    wrapper[key] = value;
  }

  return wrapper;
}
