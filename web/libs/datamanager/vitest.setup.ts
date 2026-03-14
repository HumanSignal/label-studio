/**
 * Expose React globally so components/deps that expect React in scope (e.g. JSX classic runtime) work.
 */
import React from "react";
(globalThis as any).React = React;
(global as any).React = React;
