/**
 * Mock for @humansignal/ui in tests so icons and subpaths resolve without SVG/real UI.
 */
import React from "react";

const IconStub = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;

export const ThemeToggle = () => <div>ThemeToggle</div>;
export const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const ToastViewport = () => null;
export const useToast = () => ({ show: () => {} });
export const Tooltip = ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>;
export const IconLink = IconStub;
export const IconCopyOutline = IconStub;
