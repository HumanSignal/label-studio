import { getSnapshot, getType, IStateTreeNode } from 'mobx-state-tree';
import { guidGenerator } from '../utils/unique';

/**
 * TODO: refactor
 */
export { guidGenerator };

/**
 * Helper function to detect HTX Component
 */
export function isHtx(component: any, name: string) {
  return typeof component.type === 'function' && component.type.name === 'Htx' + name;
}

/**
 * Clone node with new ID
 * @param {*} node
 */
export function cloneNode(node: IStateTreeNode) {
  const snapshot = getSnapshot(node);
  const snapshotRandomId = getType(node).create({
    ...snapshot,
    id: guidGenerator(),
  });

  return snapshotRandomId;
}

