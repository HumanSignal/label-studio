import type React from "react";
/** Stub for SVG imports in Vitest (no SVGR). Export a React component so "export { ReactComponent as X } from './y.svg'" works. */
const SvgStub = (props: React.SVGProps<SVGSVGElement>) => <svg {...(props as any)} />;
export const ReactComponent = SvgStub;
export default "";
