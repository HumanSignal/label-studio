declare module "truncate-middle" {
  function truncate(text: string, startLength: number, endLength: number, ellipsis?: string): string;
  export default truncate;
}
