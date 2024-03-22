declare module "shallow-equal" {
  type primitives = string | number | boolean | bigint | undefined | symbol | null;
  export function shallowEqualArrays(arr1: primitives[], arr2: primitives[]);

  interface primitiveObject {
    [key: string]: primitives;
  }
  export function shallowEqualObjects(obj1: primitiveObject, obj2: primitiveObject);

  export function shallowEqualObjects(obj1: unknown, obj2: unknown);
}
