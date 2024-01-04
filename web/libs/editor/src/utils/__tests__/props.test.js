/* global describe, expect, it */

import { interpolateProp, normalizeAngle } from '../props';

describe('normalizeAngle', () => {
  it('returns the same value for angle in the interval (-180; 180]', () => {
    expect(normalizeAngle(-179.8)).toBe(-179.8);
    expect(normalizeAngle(-42)).toBe(-42);
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(180)).toBe(180);
  }); 
  it('projects angles from the intervals [-360;-180] and (180;360] onto the interval (-180; 180]', () => {
    expect(normalizeAngle(-360)).toBe(0);
    expect(normalizeAngle(-181)).toBe(179);
    expect(normalizeAngle(220)).toBe(-140);
    expect(normalizeAngle(359)).toBe(-1);
  });
});

describe('interpolateProp', () => {
  it('returns the exact value from the object containing the given frame', () => {
    const objA = {
      x: 0,
      y: -50,
      size: 100,
      frame: 1,
    };
    const objB = {
      x: 700,
      y: -500,
      size: 1,
      frame: 100,
    };

    for (const prop of Object.keys(objA)) {
      expect(interpolateProp(objA, objB, objA.frame, prop)).toBe(objA[prop]);
      expect(interpolateProp(objA, objB, objB.frame, prop)).toBe(objB[prop]);
    }
  });
  it('linearly interpolates numeric properties between frames', () => {
    const objA = {
      x: -10,
      y: -50,
      size: 3,
      frame: 0,
    };
    const objB = {
      x: 10,
      y: -500,
      size: 4,
      frame: 100,
    };

    expect(interpolateProp(objA, objB, 25, 'x')).toBe(-5);
    expect(interpolateProp(objA, objB, 50, 'x')).toBe(0);
    expect(interpolateProp(objA, objB, 75, 'x')).toBe(5);
    expect(interpolateProp(objA, objB, 8, 'y')).toBe(-86);
    expect(interpolateProp(objA, objB, 30, 'y')).toBe(-185);
    expect(interpolateProp(objA, objB, 72, 'y')).toBe(-374);
    expect(interpolateProp(objA, objB, 50, 'size')).toBe(3.5);
    expect(interpolateProp(objA, objB, 88, 'size')).toBe(3.88);
    expect(interpolateProp(objA, objB, 3, 'size')).toBe(3.03);
  });
  it('linearly interpolates rotation in the shortest way', () => {
    const objA = {
      rotation: -170,
      frame: 0,
    };
    const objB = {
      rotation: 170,
      frame: 20,
    };

    expect(interpolateProp(objA, objB, 0, 'rotation')).toBe(-170);
    expect(interpolateProp(objA, objB, 5, 'rotation')).toBe(-175);
    expect(interpolateProp(objA, objB, 10, 'rotation')).toBe(180);
    expect(interpolateProp(objA, objB, 15, 'rotation')).toBe(175);
    expect(interpolateProp(objA, objB, 20, 'rotation')).toBe(170);

    expect(interpolateProp(objB, objA, 15, 'rotation')).toBe(175);

    const objE = {
      rotation: 180,
      frame: 0,
    };
    const objN = {
      rotation: 90,
      frame: 10,
    };
    const objW = {
      rotation: 0,
      frame: 20,
    };
    const objS = {
      rotation: -90,
      frame: 30,
    };

    expect(interpolateProp(objE, objN, 5, 'rotation')).toBe(135);
    expect(interpolateProp(objN, objW, 15, 'rotation')).toBe(45);
    expect(interpolateProp(objW, objS, 25, 'rotation')).toBe(-45);
    expect(interpolateProp(objS, objE, 15, 'rotation')).toBe(-135);
  });
});
