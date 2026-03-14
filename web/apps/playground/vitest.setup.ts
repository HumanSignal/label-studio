/**
 * Expose React globally and set NODE_ENV=test so JSX and useToast (ToastProvider check) work in tests.
 */
import React from "react";

process.env.NODE_ENV = "test";
(globalThis as unknown as { React: typeof React }).React = React;
