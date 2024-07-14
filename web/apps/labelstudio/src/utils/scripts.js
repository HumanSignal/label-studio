const loadedScripts = new Set();

/**
 * Check wether it's a real script tag or not
 * @param {HTMLScriptElement} script
 */
const isScriptTag = (script) => {
  return [null, undefined, "", "text/javascript"].includes(script.type);
};

/**
 * Create a blob url from inline script
 * @param {String} scriptContent
 */
const createScriptLink = (scriptContent) => {
  const blob = new Blob([scriptContent], { type: "text/javascript" });
  return URL.createObjectURL(blob).toString();
};

export const isScriptValid = (scriptTag, forceUpdate) => {
  // Check wether the tag is a real script or not
  if (!isScriptTag(scriptTag)) {
    return false;
  }

  // Skip loading already existing scripts
  if (scriptTag.dataset.alwaysReload === undefined) {
    if (forceUpdate !== true && loadedScripts.has(scriptTag.outerHTML)) {
      return false;
    }
  }

  // Skip if the script is not attached to DOM
  if (!scriptTag.parentNode) {
    return false;
  }

  return true;
};

export const clearScriptsCache = () => {
  loadedScripts.clear();
};

/**
 * @param {HTMLScriptElement} targetScript
 * @param {HTMLScriptElement} sourceScript
 */
const swapScripts = (targetScript, sourceScript) => {
  return new Promise((resolve) => {
    /**@type {HTMLScriptElement} */
    const newScript = document.createElement("script");

    sourceScript = sourceScript ?? targetScript;

    // Use existing src or create url from script content
    // This is necessary for onload event to work properly
    const src = sourceScript.src || createScriptLink(sourceScript.text);

    // Remember the script to prevent loading it more than once
    loadedScripts.add(sourceScript.outerHTML);

    // We respect async attribute, so we only wait for script to load
    // when it's explicitly no async attribute
    if (!sourceScript.async) {
      const onScriptLoaded = ({ type }) => {
        newScript.removeEventListener("load", onScriptLoaded);
        newScript.removeEventListener("error", onScriptLoaded);
        resolve(type === "error" ? false : newScript);
      };

      newScript.addEventListener("load", onScriptLoaded);
      newScript.addEventListener("error", onScriptLoaded);
    } else {
      resolve();
    }

    if (sourceScript.dataset.alwaysReload !== undefined) {
      newScript.dataset.alwaysReload = "";
    }

    if (sourceScript.id) newScript.id = sourceScript.id;
    if (sourceScript.className) newScript.className = sourceScript.className;

    newScript.dataset.replaced = "true";
    newScript.async = sourceScript.async;
    newScript.defer = sourceScript.defer;
    newScript.type = "text/javascript";
    newScript.src = src;

    targetScript.parentNode.insertBefore(newScript, targetScript);
    targetScript.remove();
  });
};

/**
 * @param {HTMLScriptElement} scriptTag
 * @param {Function} onReplace
 */
export const replaceScript = async (scriptTag, { sourceScript, forceUpdate = false } = {}) => {
  sourceScript = sourceScript ?? scriptTag;

  if (!isScriptValid(scriptTag, forceUpdate)) return;
  if (sourceScript !== scriptTag && !isScriptValid(sourceScript, forceUpdate)) return;

  return swapScripts(scriptTag, sourceScript);
};

const scriptIterator = function* (scripts) {
  while (scripts.length) {
    const nextScript = scripts.shift();
    yield replaceScript(nextScript).then((result) => {
      return result;
    });
  }
};

/**
 * Re-inserts script tags inside a given element
 * Only scripts with src or with empty type, or with
 * type text/javascript will be processed
 * @param {HTMLElement} root
 */
export const reInsertScripts = async (root) => {
  const scripts = root.querySelectorAll("script");

  if (!scripts.length) return [];

  const iterarot = scriptIterator(Array.from(scripts));
  const result = [];

  for await (const script of iterarot) {
    result.push(script);
  }

  return result;
};
