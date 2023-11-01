declare module "shallow-equal" {
  export function shallowEqualArrays(arr1: any[], arr2: any[]): boolean;
  export function shallowEqualObjects(arr1: Record<any, any>, arr2: Record<any, any>): boolean;
}
