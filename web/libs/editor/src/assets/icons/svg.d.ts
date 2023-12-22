type SvgrComponent = React.StatelessComponent<React.SVGAttributes<SVGElement>>

declare module '*.svg' {
  const value: SvgrComponent;

  export default value;
  export const ReactComponent = value;
}
