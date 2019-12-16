/**
 * Get flattened coordinates
 * @param {array} objects Array of objects with 2
 * @returns {array} Array of elements
 */
export function getFlattenedCoordinates(objects) {
  let flattenedCoordinates = [];

  objects.map(element => flattenedCoordinates.push(element.x, element.y));

  return flattenedCoordinates;
}
