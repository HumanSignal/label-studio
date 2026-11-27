// Stand-ins for the @nx/react typings libs/ui/tsconfig.lib.json names (not installed here).
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module "*.css";
