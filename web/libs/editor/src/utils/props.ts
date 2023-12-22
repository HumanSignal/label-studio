/**
 * project any angle onto the interval (-180;180]
 */
export function normalizeAngle(angle: number) {
  let a = angle;

  while (a > 0) a -= 360;
  return (a - 180) % 360 + 180;
}

type SequenceItem = {
  frame: number, 
  [k: string]: any,
}

/** 
 * interpolate prop between two sequence items
 * @return {any} propValue
 * @example
 * interpolateProp({frame: 0, x: -10}, {frame: 100, x: 10}, 25, 'x'); // will return -5
 * @example
 * interpolateProp(
 *   {frame: 0, rotation: -170},
 *   {frame: 20, rotation: 170},
 *   5,
 *   'rotation'
 * ); // will return -175
 */
export const interpolateProp = (start: SequenceItem, end: SequenceItem, frame: number, prop: string): any => {
  // @todo edge cases
  const r = (frame - start.frame) / (end.frame - start.frame);

  // Interpolation of angles is more tricky due to the cyclical nature of the angle value.
  if (prop === 'rotation') {
    // In order to perform interpolation over the shortest distance,
    // we must normalize the difference in the values of the angles to the interval of [180;180) degrees,
    // because this is analogous to [0;360) degrees,
    // but at the same time the maximum absolute value remains the minimum possible 180 degrees.
    const dAngle = normalizeAngle(end[prop] - start[prop]);

    return normalizeAngle(start[prop] + dAngle * r);
  }
  return start[prop] + (end[prop] - start[prop]) * r;
};
