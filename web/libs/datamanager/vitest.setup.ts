/**
 * Expose React globally and set APP_SETTINGS for tests that touch code using absoluteURL or window.APP_SETTINGS.
 * NODE_ENV=test so components that branch on test env (e.g. CodeView virtualization fallback) use real behavior without mocks.
 */
import React from "react";
import { setLivelinessChecking } from "mobx-state-tree";

if (typeof process !== "undefined") process.env.NODE_ENV = "test";
(globalThis as any).React = React;

// Suppress mobx-state-tree warnings and "Warning:" logs in test output.
setLivelinessChecking("ignore");
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args[0];
  const str = typeof msg === "string" ? msg : msg instanceof Error ? msg.message : String(msg ?? "");
  if (str.includes("[mobx-state-tree]") || str.startsWith("Warning:")) return;
  origWarn.apply(console, args);
};
(global as any).React = React;

const appSettings = { hostname: "http://localhost", whitelabel_is_active: false };
(globalThis as any).APP_SETTINGS = appSettings;
if (typeof window !== "undefined") (window as any).APP_SETTINGS = appSettings;
