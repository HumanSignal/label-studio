import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { ErrorWrapper } from "../../components/Error/Error";
import { modal } from "../../components/Modal/Modal";
import { ConfigContext } from "../../providers/ConfigProvider";
import { FF_UNSAVED_CHANGES, isFF } from "../../utils/feature-flags";
import { absoluteURL, removePrefix } from "../../utils/helpers";
import { clearScriptsCache, isScriptValid, reInsertScripts, replaceScript } from "../../utils/scripts";
import { UNBLOCK_HISTORY_MESSAGE } from "../App";

const pageCache = new Map();

const pageFromHTML = (html) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  return document;
};

const loadAsyncPage = async (url) => {
  try {
    if (pageCache.has(url)) {
      return pageCache.get(url);
    }
    const response = await fetch(url);
    const html = await response.text();

    if (response.status === 401) {
      location.href = absoluteURL("/");
      return;
    }

    if (!response.ok) {
      modal({
        body: () => (
          <ErrorWrapper
            title={`Error ${response.status}: ${response.statusText}`}
            errorId={response.status}
            stacktrace={`Cannot load url ${url}\n\n${html}`}
          />
        ),
        allowClose: false,
        style: { width: 680 },
      });
      return null;
    }

    pageCache.set(url, html);
    return html;
  } catch (err) {
    modal({
      body: () => (
        <ErrorWrapper
          possum={false}
          title={"Connection refused"}
          message={"Server not responding. Is it still running?"}
        />
      ),
      simple: true,
      allowClose: false,
      style: { width: 680 },
    });
    return null;
  }
};

/**
 * @param {HTMLElement} oldNode
 * @param {HTMLElement} newNode
 */
const swapNodes = async (oldNode, newNode) => {
  if (oldNode && newNode) {
    oldNode.replaceWith(newNode);
    await reInsertScripts(newNode);
  }
};

/**
 * @param {Document} oldPage
 * @param {Document} newPage
 */
const swapAppSettings = async (oldPage, newPage) => {
  const oldSettings = oldPage.querySelector("script#app-settings");
  const newSettings = newPage.querySelector("script#app-settings");

  if (oldSettings && newSettings) {
    await replaceScript(oldSettings, {
      sourceScript: newSettings,
      forceUpdate: true,
    });
  }
};

/**
 * @param {Document} oldPage
 * @param {Document} newPage
 */
const swapContent = async (oldPage, newPage) => {
  const currentContent = oldPage.querySelector("#dynamic-content");
  const newContent = newPage.querySelector("#dynamic-content");

  if (currentContent && newContent) {
    await swapNodes(currentContent, newContent);
  } else {
    await swapNodes(oldPage.body.children[0], newContent, { removeOld: false });
  }
};

/** @param {HTMLElement} nodes */
const nodesToSignatures = (nodes) => {
  return new Set(Array.from(nodes).map((n) => n.outerHTML));
};

/**
 * @param {HTMLHeadElement} oldHead
 * @param {HTMLHeadElement} newHead
 */
const swapHeadScripts = async (oldHead, newHead) => {
  swapNodes(oldHead.querySelector("title"), newHead.querySelector("title"));

  const fragment = document.createDocumentFragment();

  Array.from(newHead.querySelectorAll("script"))
    .filter((script) => isScriptValid(script))
    .forEach((script) => fragment.appendChild(script));

  Array.from(oldHead.querySelectorAll("script"))
    .filter((script) => isScriptValid(script))
    .forEach((script) => script.remove());

  oldHead.appendChild(fragment);
  await reInsertScripts(oldHead);
};

/**
 * @param {Document} oldPage
 * @param {Document} newPage
 */
const swapStylesheets = async (oldPage, newPage) => {
  const linkSelector = ["style:not([data-replaced])", "link[rel=stylesheet]:not([data-replaced])"].join(", ");
  const oldStyles = Array.from(oldPage.querySelectorAll(linkSelector));
  const newStyles = Array.from(newPage.querySelectorAll(linkSelector));

  const existingSignatures = nodesToSignatures(oldStyles);
  const stylesToReplace = newStyles.filter((style) => !existingSignatures.has(style.outerHTML));

  await Promise.all(
    stylesToReplace.map(
      (style) =>
        new Promise((resolve) => {
          style.onload = () => resolve(style.outerHTML);
          document.head.append(style);
        }),
    ),
  );
};

/** @param {Document} newPage */
const swapPageParts = async (newPage, onReady) => {
  document.title = newPage.title;

  await swapStylesheets(document, newPage);
  await swapHeadScripts(document.head, newPage.head);
  await swapAppSettings(document, newPage);
  await swapContent(document, newPage);
  onReady?.();
};

const isVisitable = (target) => {
  if (!target) return false;
  if (target.dataset.external) return false;
  if (target.getAttribute("href").match(/#/)) return false;
  if (target.origin !== location.origin) return false;

  return true;
};

const locationWithoutHash = () => {
  const { href } = location;
  return href.replace(/#(.*)/g, "");
};

const fetchPage = async (locationUrl) => {
  const html = await loadAsyncPage(locationUrl);
  return html ? pageFromHTML(html) : null;
};

let currentLocation = locationWithoutHash();

const useStaticContent = (initialContent, onContentLoad) => {
  const [staticContent, setStaticContent] = useState(initialContent);

  const fetchCallback = useCallback(async (locationUrl) => {
    currentLocation = locationUrl;
    clearScriptsCache();
    const result = await fetchPage(locationUrl);

    if (result) {
      await swapPageParts(result, onContentLoad);
      setStaticContent(result);
      return true;
    }
    return false;
  }, []);

  return [staticContent, fetchCallback];
};

export const AsyncPageContext = createContext(null);

export const AsyncPageConsumer = AsyncPageContext.Consumer;

export const AsyncPage = ({ children }) => {
  const initialContent = document;

  const history = useHistory();
  const config = useContext(ConfigContext);
  const onLoadCallback = useCallback(() => {
    config.update(window.APP_SETTINGS);
  }, []);
  const [staticContent, fetchStatic] = useStaticContent(initialContent, onLoadCallback);

  const onLinkClick = useCallback(async (e) => {
    /**@type {HTMLAnchorElement} */
    const target = e.target.closest("a[href]:not([target]):not([download])");

    if (!isVisitable(target)) return;
    if (target.matches("[data-external]")) return;
    if (e.metaKey || e.ctrlKey) return;

    e.preventDefault();
    const fetched = await fetchStatic(target.href);

    if (fetched) {
      history.push(`${removePrefix(target.pathname)}${target.search}`);
    }
  }, []);

  const onPopState = useCallback(() => {
    // Prevent false positive triggers in case of blocking page transitions
    if (isFF(FF_UNSAVED_CHANGES) && history.isBlocking) return;
    const newLocation = locationWithoutHash();
    const isSameLocation = newLocation === currentLocation;

    if (!isSameLocation) {
      currentLocation = newLocation;
      fetchStatic(newLocation);
    }
  }, []);

  // Fallback in case of blocked transitions
  const onMessage = useCallback((event) => {
    if (event.origin !== window.origin) return;
    if (event.data?.source !== "label-studio") return;
    if (event.data?.payload !== UNBLOCK_HISTORY_MESSAGE) return;
    onPopState();
  }, []);

  // useEffect(onPopState, [location]);

  useEffect(() => {
    document.addEventListener("click", onLinkClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    isFF(FF_UNSAVED_CHANGES) && window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("click", onLinkClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      isFF(FF_UNSAVED_CHANGES) && window.removeEventListener("message", onMessage);
    };
  }, []);

  return <AsyncPageContext.Provider value={staticContent}>{children}</AsyncPageContext.Provider>;
};
