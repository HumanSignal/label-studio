import { KonvaNode, WorkingArea } from './types';
import { MIN_SIZE } from '../../../tools/Base';

export const getNodeAbsoluteDimensions = (node: KonvaNode, workingArea: WorkingArea) => {
  const { realWidth: width, realHeight: height } = workingArea;

  const result = {
    x: node.x() / width * 100,
    y: node.y() / height * 100,
    width: node.width() / width * 100,
    height: node.height() / height * 100,
    rotation: node.rotation(),
  };

  return result;
};

export const normalizeNodeDimentions = <T extends KonvaNode>(node: T, shapeType: 'rect') => {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();

  switch (shapeType) {
    case 'rect': {
      node.width(Math.max(MIN_SIZE.X, node.width() * scaleX));
      node.height(Math.max(MIN_SIZE.Y, node.height() * scaleY));
      break;
    }
  }

  node.scaleX(1);
  node.scaleY(1);
};
