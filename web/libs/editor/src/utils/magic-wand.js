/* eslint-disable prefer-const */

import chroma from 'chroma-js';

// Magic Wand (Fuzzy Selection Tool) for Javascript
//
// The MIT License (MIT)
//
// Copyright (c) 2014, Ryasnoy Paul (ryasnoypaul@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice avnd this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const MagicWand = (function() {
  const lib = {};

  /** Create a binary mask on the image by color threshold
   * Algorithm: Scanline flood fill (http://en.wikipedia.org/wiki/Flood_fill)
   * @param {Object} image: {Uint8Array} data, {int} width, {int} height, {int} bytes
   * @param {int} x of start pixel
   * @param {int} y of start pixel
   * @param {int} color threshold
   * @param {Uint8Array} mask of visited points (optional)
   * @return {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   */
  lib.floodFill = function(image, px, py, colorThreshold, mask) {
    let c,
      x,
      newY,
      el,
      xr,
      xl,
      dy,
      dyl,
      dyr,
      checkY,
      data = image.data,
      w = image.width,
      h = image.height,
      bytes = image.bytes, // number of bytes in the color
      maxX = -1,
      minX = w + 1,
      maxY = -1,
      minY = h + 1,
      i = py * w + px, // start point index in the mask data
      result = new Uint8Array(w * h), // result mask
      visited = new Uint8Array(mask ? mask : w * h); // mask of visited points

    if (visited[i] === 1) return null;

    i = i * bytes; // start point index in the image data
    const sampleColor = [data[i], data[i + 1], data[i + 2], data[i + 3]]; // start point color (sample)

    const stack = [{ y: py, left: px - 1, right: px + 1, dir: 1 }]; // first scanning line

    do {
      el = stack.shift(); // get line for scanning

      checkY = false;
      for (x = el.left + 1; x < el.right; x++) {
        dy = el.y * w;
        i = (dy + x) * bytes; // point index in the image data

        if (visited[dy + x] === 1) continue; // check whether the point has been visited
        // compare the color of the sample
        c = data[i] - sampleColor[0]; // check by red
        if (c > colorThreshold || c < -colorThreshold) continue;
        c = data[i + 1] - sampleColor[1]; // check by green
        if (c > colorThreshold || c < -colorThreshold) continue;
        c = data[i + 2] - sampleColor[2]; // check by blue
        if (c > colorThreshold || c < -colorThreshold) continue;

        checkY = true; // if the color of the new point(x,y) is similar to the sample color need to check minmax for Y

        result[dy + x] = 1; // mark a new point in mask
        visited[dy + x] = 1; // mark a new point as visited

        xl = x - 1;
        // walk to left side starting with the left neighbor
        while (xl > -1) {
          dyl = dy + xl;
          i = dyl * bytes; // point index in the image data
          if (visited[dyl] === 1) break; // check whether the point has been visited
          // compare the color of the sample
          c = data[i] - sampleColor[0]; // check by red
          if (c > colorThreshold || c < -colorThreshold) break;
          c = data[i + 1] - sampleColor[1]; // check by green
          if (c > colorThreshold || c < -colorThreshold) break;
          c = data[i + 2] - sampleColor[2]; // check by blue
          if (c > colorThreshold || c < -colorThreshold) break;

          result[dyl] = 1;
          visited[dyl] = 1;

          xl--;
        }
        xr = x + 1;
        // walk to right side starting with the right neighbor
        while (xr < w) {
          dyr = dy + xr;
          i = dyr * bytes; // index point in the image data
          if (visited[dyr] === 1) break; // check whether the point has been visited
          // compare the color of the sample
          c = data[i] - sampleColor[0]; // check by red
          if (c > colorThreshold || c < -colorThreshold) break;
          c = data[i + 1] - sampleColor[1]; // check by green
          if (c > colorThreshold || c < -colorThreshold) break;
          c = data[i + 2] - sampleColor[2]; // check by blue
          if (c > colorThreshold || c < -colorThreshold) break;

          result[dyr] = 1;
          visited[dyr] = 1;

          xr++;
        }

        // check minmax for X
        if (xl < minX) minX = xl + 1;
        if (xr > maxX) maxX = xr - 1;

        newY = el.y - el.dir;
        if (newY >= 0 && newY < h) {
          // add two scanning lines in the opposite direction (y - dir) if necessary
          if (xl < el.left) stack.push({ y: newY, left: xl, right: el.left, dir: -el.dir }); // from "new left" to "current left"
          if (el.right < xr) stack.push({ y: newY, left: el.right, right: xr, dir: -el.dir }); // from "current right" to "new right"
        }
        newY = el.y + el.dir;
        if (newY >= 0 && newY < h) {
          // add the scanning line in the direction (y + dir) if necessary
          if (xl < xr) stack.push({ y: newY, left: xl, right: xr, dir: el.dir }); // from "new left" to "new right"
        }
      }
      // check minmax for Y if necessary
      if (checkY) {
        if (el.y < minY) minY = el.y;
        if (el.y > maxY) maxY = el.y;
      }
    } while (stack.length > 0);

    return {
      data: result,
      width: image.width,
      height: image.height,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
      },
    };
  };

  /** Apply the gauss-blur filter to binary mask
   * Algorithms: http://blog.ivank.net/fastest-gaussian-blur.html
   * http://www.librow.com/articles/article-9
   * http://elynxsdk.free.fr/ext-docs/Blur/Fast_box_blur.pdf
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @param {int} blur radius
   * @return {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   */
  lib.gaussBlur = function(mask, radius) {
    let i,
      k,
      k1,
      x,
      y,
      val,
      start,
      end,
      n = radius * 2 + 1, // size of the pattern for radius-neighbors (from -r to +r with the center point)
      s2 = radius * radius,
      wg = new Float32Array(n), // weights
      total = 0, // sum of weights(used for normalization)
      w = mask.width,
      h = mask.height,
      data = mask.data,
      minX = mask.bounds.minX,
      maxX = mask.bounds.maxX,
      minY = mask.bounds.minY,
      maxY = mask.bounds.maxY;

    // calc gauss weights
    for (i = 0; i < radius; i++) {
      const dsq = (radius - i) * (radius - i);
      const ww = Math.exp(-dsq / (2.0 * s2)) / (2 * Math.PI * s2);

      wg[radius + i] = wg[radius - i] = ww;
      total += 2 * ww;
    }
    // normalization weights
    for (i = 0; i < n; i++) {
      wg[i] /= total;
    }

    const result = new Uint8Array(w * h), // result mask
      endX = radius + w,
      endY = radius + h;

    //walk through all source points for blur
    for (y = minY; y < maxY + 1; y++)
      for (x = minX; x < maxX + 1; x++) {
        val = 0;
        k = y * w + x; // index of the point
        start = radius - x > 0 ? radius - x : 0;
        end = endX - x < n ? endX - x : n; // Math.min((((w - 1) - x) + radius) + 1, n);
        k1 = k - radius;
        // walk through x-neighbors
        for (i = start; i < end; i++) {
          val += data[k1 + i] * wg[i];
        }
        start = radius - y > 0 ? radius - y : 0;
        end = endY - y < n ? endY - y : n; // Math.min((((h - 1) - y) + radius) + 1, n);
        k1 = k - radius * w;
        // walk through y-neighbors
        for (i = start; i < end; i++) {
          val += data[k1 + i * w] * wg[i];
        }
        result[k] = val > 0.5 ? 1 : 0;
      }

    return {
      data: result,
      width: w,
      height: h,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
      },
    };
  };

  /** Create a border index array of boundary points of the mask with radius-neighbors
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @param {int} blur radius
   * @param {Uint8Array} visited: mask of visited points (optional)
   * @return {Array} border index array of boundary points with radius-neighbors (only points need for blur)
   */
  function createBorderForBlur(mask, radius, visited) {
    let x,
      i,
      j,
      y,
      k,
      k1,
      k2,
      w = mask.width,
      h = mask.height,
      data = mask.data,
      visitedData = new Uint8Array(data),
      minX = mask.bounds.minX,
      maxX = mask.bounds.maxX,
      minY = mask.bounds.minY,
      maxY = mask.bounds.maxY,
      len = w * h,
      temp = new Uint8Array(len), // auxiliary array to check uniqueness
      border = [], // only border points
      x0 = Math.max(minX, 1),
      x1 = Math.min(maxX, w - 2),
      y0 = Math.max(minY, 1),
      y1 = Math.min(maxY, h - 2);

    if (visited && visited.length > 0) {
      // copy visited points (only "black")
      for (k = 0; k < len; k++) {
        if (visited[k] === 1) visitedData[k] = 1;
      }
    }

    // walk through inner values except points on the boundary of the image
    for (y = y0; y < y1 + 1; y++)
      for (x = x0; x < x1 + 1; x++) {
        k = y * w + x;
        if (data[k] === 0) continue; // "white" point isn't the border
        k1 = k + w; // y + 1
        k2 = k - w; // y - 1
        // check if any neighbor with a "white" color
        if (
          visitedData[k + 1] === 0 ||
          visitedData[k - 1] === 0 ||
          visitedData[k1] === 0 ||
          visitedData[k1 + 1] === 0 ||
          visitedData[k1 - 1] === 0 ||
          visitedData[k2] === 0 ||
          visitedData[k2 + 1] === 0 ||
          visitedData[k2 - 1] === 0
        ) {
          //if (visitedData[k + 1] + visitedData[k - 1] +
          //    visitedData[k1] + visitedData[k1 + 1] + visitedData[k1 - 1] +
          //    visitedData[k2] + visitedData[k2 + 1] + visitedData[k2 - 1] === 8) continue;
          border.push(k);
        }
      }

    // walk through points on the boundary of the image if necessary
    // if the "black" point is adjacent to the boundary of the image, it is a border point
    if (minX === 0) for (y = minY; y < maxY + 1; y++) if (data[y * w] === 1) border.push(y * w);

    if (maxX === w - 1) for (y = minY; y < maxY + 1; y++) if (data[y * w + maxX] === 1) border.push(y * w + maxX);

    if (minY === 0) for (x = minX; x < maxX + 1; x++) if (data[x] === 1) border.push(x);

    if (maxY === h - 1) for (x = minX; x < maxX + 1; x++) if (data[maxY * w + x] === 1) border.push(maxY * w + x);

    let result = [], // border points with radius-neighbors
      start,
      end,
      endX = radius + w,
      endY = radius + h,
      n = radius * 2 + 1; // size of the pattern for radius-neighbors (from -r to +r with the center point)

    len = border.length;
    // walk through radius-neighbors of border points and add them to the result array
    for (j = 0; j < len; j++) {
      k = border[j]; // index of the border point
      temp[k] = 1; // mark border point
      result.push(k); // save the border point
      x = k % w; // calc x by index
      y = (k - x) / w; // calc y by index
      start = radius - x > 0 ? radius - x : 0;
      end = endX - x < n ? endX - x : n; // Math.min((((w - 1) - x) + radius) + 1, n);
      k1 = k - radius;
      // walk through x-neighbors
      for (i = start; i < end; i++) {
        k2 = k1 + i;
        if (temp[k2] === 0) {
          // check the uniqueness
          temp[k2] = 1;
          result.push(k2);
        }
      }
      start = radius - y > 0 ? radius - y : 0;
      end = endY - y < n ? endY - y : n; // Math.min((((h - 1) - y) + radius) + 1, n);
      k1 = k - radius * w;
      // walk through y-neighbors
      for (i = start; i < end; i++) {
        k2 = k1 + i * w;
        if (temp[k2] === 0) {
          // check the uniqueness
          temp[k2] = 1;
          result.push(k2);
        }
      }
    }

    return result;
  }

  /** Apply the gauss-blur filter ONLY to border points with radius-neighbors
   * Algorithms: http://blog.ivank.net/fastest-gaussian-blur.html
   * http://www.librow.com/articles/article-9
   * http://elynxsdk.free.fr/ext-docs/Blur/Fast_box_blur.pdf
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @param {int} blur radius
   * @param {Uint8Array} visited: mask of visited points (optional)
   * @return {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   */
  lib.gaussBlurOnlyBorder = function(mask, radius, visited) {
    let border = createBorderForBlur(mask, radius, visited), // get border points with radius-neighbors
      ww,
      dsq,
      i,
      j,
      k,
      k1,
      x,
      y,
      val,
      start,
      end,
      n = radius * 2 + 1, // size of the pattern for radius-neighbors (from -r to +r with center point)
      s2 = 2 * radius * radius,
      wg = new Float32Array(n), // weights
      total = 0, // sum of weights(used for normalization)
      w = mask.width,
      h = mask.height,
      data = mask.data,
      minX = mask.bounds.minX,
      maxX = mask.bounds.maxX,
      minY = mask.bounds.minY,
      maxY = mask.bounds.maxY,
      len = border.length;

    // calc gauss weights
    for (i = 0; i < radius; i++) {
      dsq = (radius - i) * (radius - i);
      ww = Math.exp(-dsq / s2) / Math.PI;
      wg[radius + i] = wg[radius - i] = ww;
      total += 2 * ww;
    }
    // normalization weights
    for (i = 0; i < n; i++) {
      wg[i] /= total;
    }

    const result = new Uint8Array(data), // copy the source mask
      endX = radius + w,
      endY = radius + h;

    //walk through all border points for blur
    for (i = 0; i < len; i++) {
      k = border[i]; // index of the border point
      val = 0;
      x = k % w; // calc x by index
      y = (k - x) / w; // calc y by index
      start = radius - x > 0 ? radius - x : 0;
      end = endX - x < n ? endX - x : n; // Math.min((((w - 1) - x) + radius) + 1, n);
      k1 = k - radius;
      // walk through x-neighbors
      for (j = start; j < end; j++) {
        val += data[k1 + j] * wg[j];
      }
      if (val > 0.5) {
        result[k] = 1;
        // check minmax
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        continue;
      }
      start = radius - y > 0 ? radius - y : 0;
      end = endY - y < n ? endY - y : n; // Math.min((((h - 1) - y) + radius) + 1, n);
      k1 = k - radius * w;
      // walk through y-neighbors
      for (j = start; j < end; j++) {
        val += data[k1 + j * w] * wg[j];
      }
      if (val > 0.5) {
        result[k] = 1;
        // check minmax
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        result[k] = 0;
      }
    }

    return {
      data: result,
      width: w,
      height: h,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
      },
    };
  };

  /** Create a border mask (only boundary points)
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @return {Object} border mask: {Uint8Array} data, {int} width, {int} height, {Object} offset
   */
  lib.createBorderMask = function(mask) {
    let x,
      y,
      k,
      k1,
      k2,
      w = mask.width,
      h = mask.height,
      data = mask.data,
      minX = mask.bounds.minX,
      maxX = mask.bounds.maxX,
      minY = mask.bounds.minY,
      maxY = mask.bounds.maxY,
      rw = maxX - minX + 1, // bounds size
      rh = maxY - minY + 1,
      result = new Uint8Array(rw * rh), // reduced mask (bounds size)
      x0 = Math.max(minX, 1),
      x1 = Math.min(maxX, w - 2),
      y0 = Math.max(minY, 1),
      y1 = Math.min(maxY, h - 2);

    // walk through inner values except points on the boundary of the image
    for (y = y0; y < y1 + 1; y++)
      for (x = x0; x < x1 + 1; x++) {
        k = y * w + x;
        if (data[k] === 0) continue; // "white" point isn't the border
        k1 = k + w; // y + 1
        k2 = k - w; // y - 1
        // check if any neighbor with a "white" color
        if (
          data[k + 1] === 0 ||
          data[k - 1] === 0 ||
          data[k1] === 0 ||
          data[k1 + 1] === 0 ||
          data[k1 - 1] === 0 ||
          data[k2] === 0 ||
          data[k2 + 1] === 0 ||
          data[k2 - 1] === 0
        ) {
          //if (data[k + 1] + data[k - 1] +
          //    data[k1] + data[k1 + 1] + data[k1 - 1] +
          //    data[k2] + data[k2 + 1] + data[k2 - 1] === 8) continue;
          result[(y - minY) * rw + (x - minX)] = 1;
        }
      }

    // walk through points on the boundary of the image if necessary
    // if the "black" point is adjacent to the boundary of the image, it is a border point
    if (minX === 0) for (y = minY; y < maxY + 1; y++) if (data[y * w] === 1) result[(y - minY) * rw] = 1;

    if (maxX === w - 1)
      for (y = minY; y < maxY + 1; y++) if (data[y * w + maxX] === 1) result[(y - minY) * rw + (maxX - minX)] = 1;

    if (minY === 0) for (x = minX; x < maxX + 1; x++) if (data[x] === 1) result[x - minX] = 1;

    if (maxY === h - 1)
      for (x = minX; x < maxX + 1; x++) if (data[maxY * w + x] === 1) result[(maxY - minY) * rw + (x - minX)] = 1;

    return {
      data: result,
      width: rw,
      height: rh,
      offset: { x: minX, y: minY },
    };
  };

  /** Create a border index array of boundary points of the mask
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height
   * @return {Array} border index array boundary points of the mask
   */
  lib.getBorderIndices = function(mask) {
    let x,
      y,
      k,
      k1,
      k2,
      w = mask.width,
      h = mask.height,
      data = mask.data,
      border = [], // only border points
      x1 = w - 1,
      y1 = h - 1;

    // walk through inner values except points on the boundary of the image
    for (y = 1; y < y1; y++)
      for (x = 1; x < x1; x++) {
        k = y * w + x;
        if (data[k] === 0) continue; // "white" point isn't the border
        k1 = k + w; // y + 1
        k2 = k - w; // y - 1
        // check if any neighbor with a "white" color
        if (
          data[k + 1] === 0 ||
          data[k - 1] === 0 ||
          data[k1] === 0 ||
          data[k1 + 1] === 0 ||
          data[k1 - 1] === 0 ||
          data[k2] === 0 ||
          data[k2 + 1] === 0 ||
          data[k2 - 1] === 0
        ) {
          //if (data[k + 1] + data[k - 1] +
          //    data[k1] + data[k1 + 1] + data[k1 - 1] +
          //    data[k2] + data[k2 + 1] + data[k2 - 1] === 8) continue;
          border.push(k);
        }
      }

    // walk through points on the boundary of the image if necessary
    // if the "black" point is adjacent to the boundary of the image, it is a border point
    for (y = 0; y < h; y++) if (data[y * w] === 1) border.push(y * w);

    for (x = 0; x < w; x++) if (data[x] === 1) border.push(x);

    k = w - 1;
    for (y = 0; y < h; y++) if (data[y * w + k] === 1) border.push(y * w + k);

    k = (h - 1) * w;
    for (x = 0; x < w; x++) if (data[k + x] === 1) border.push(k + x);

    return border;
  };

  /** Create a compressed mask with a "white" border (1px border with zero values) for the contour tracing
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @return {Object} border mask: {Uint8Array} data, {int} width, {int} height, {Object} offset
   */
  function prepareMask(mask) {
    let x,
      y,
      w = mask.width,
      data = mask.data,
      minX = mask.bounds.minX,
      maxX = mask.bounds.maxX,
      minY = mask.bounds.minY,
      maxY = mask.bounds.maxY,
      rw = maxX - minX + 3, // bounds size +1 px on each side (a "white" border)
      rh = maxY - minY + 3,
      result = new Uint8Array(rw * rh); // reduced mask (bounds size)

    // walk through inner values and copy only "black" points to the result mask
    for (y = minY; y < maxY + 1; y++)
      for (x = minX; x < maxX + 1; x++) {
        if (data[y * w + x] === 1) result[(y - minY + 1) * rw + (x - minX + 1)] = 1;
      }

    return {
      data: result,
      width: rw,
      height: rh,
      offset: { x: minX - 1, y: minY - 1 },
    };
  }

  /** Create a contour array for the binary mask
   * Algorithm: http://www.sciencedirect.com/science/article/pii/S1077314203001401
   * @param {Object} mask: {Uint8Array} data, {int} width, {int} height, {Object} bounds
   * @return {Array} contours: {Array} points, {bool} inner, {int} label
   */
  lib.traceContours = function(mask) {
    let m = prepareMask(mask),
      contours = [],
      label = 0,
      w = m.width,
      w2 = w * 2,
      h = m.height,
      src = m.data,
      dx = m.offset.x,
      dy = m.offset.y,
      dest = new Uint8Array(src), // label matrix
      i,
      j,
      x,
      y,
      k,
      k1,
      c,
      inner,
      dir,
      first,
      second,
      current,
      previous,
      next,
      d;

    // all [dx,dy] pairs (array index is the direction)
    // 5 6 7
    // 4 X 0
    // 3 2 1
    const directions = [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ];

    for (y = 1; y < h - 1; y++)
      for (x = 1; x < w - 1; x++) {
        k = y * w + x;
        if (src[k] === 1) {
          for (i = -w; i < w2; i += w2) {
            // k - w: outer tracing (y - 1), k + w: inner tracing (y + 1)
            if (src[k + i] === 0 && dest[k + i] === 0) {
              // need contour tracing
              inner = i === w; // is inner contour tracing ?
              label++; // label for the next contour

              c = [];
              dir = inner ? 2 : 6; // start direction
              current = previous = first = { x, y };
              second = null;
              // eslint-disable-next-line no-constant-condition
              while (true) {
                dest[current.y * w + current.x] = label; // mark label for the current point
                // bypass all the neighbors around the current point in a clockwise
                for (j = 0; j < 8; j++) {
                  dir = (dir + 1) % 8;

                  // get the next point by new direction
                  d = directions[dir]; // index as direction
                  next = { x: current.x + d[0], y: current.y + d[1] };

                  k1 = next.y * w + next.x;
                  if (src[k1] === 1) {
                    // black boundary pixel
                    dest[k1] = label; // mark a label
                    break;
                  }
                  dest[k1] = -1; // mark a white boundary pixel
                  next = null;
                }
                if (next === null) break; // no neighbours (one-point contour)
                current = next;
                if (second) {
                  if (
                    previous.x === first.x &&
                    previous.y === first.y &&
                    current.x === second.x &&
                    current.y === second.y
                  ) {
                    break; // creating the contour completed when returned to original position
                  }
                } else {
                  second = next;
                }
                c.push({ x: previous.x + dx, y: previous.y + dy });
                previous = current;
                dir = (dir + 4) % 8; // next dir (symmetrically to the current direction)
              }

              if (next !== null) {
                c.push({ x: first.x + dx, y: first.y + dy }); // close the contour
                contours.push({ inner, label, points: c }); // add contour to the list
              }
            }
          }
        }
      }

    return contours;
  };

  /** Simplify contours
   * Algorithms: http://psimpl.sourceforge.net/douglas-peucker.html
   * http://neerc.ifmo.ru/wiki/index.php?title=%D0%A3%D0%BF%D1%80%D0%BE%D1%89%D0%B5%D0%BD%D0%B8%D0%B5_%D0%BF%D0%BE%D0%BB%D0%B8%D0%B3%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9_%D1%86%D0%B5%D0%BF%D0%B8
   * @param {Array} contours: {Array} points, {bool} inner, {int} label
   * @param {float} simplify tolerant
   * @param {int} simplify count: min number of points when the contour is simplified
   * @return {Array} contours: {Array} points, {bool} inner, {int} label, {int} initialCount
   */
  lib.simplifyContours = function(contours, simplifyTolerant, simplifyCount) {
    let lenContours = contours.length,
      result = [],
      i,
      j,
      k,
      c,
      points,
      len,
      resPoints,
      lst,
      stack,
      ids,
      maxd,
      maxi,
      dist,
      r1,
      r2,
      r12,
      dx,
      dy,
      pi,
      pf,
      pl;

    // walk through all contours
    for (j = 0; j < lenContours; j++) {
      c = contours[j];
      points = c.points;
      len = c.points.length;

      if (len < simplifyCount) {
        // contour isn't simplified
        resPoints = [];
        for (k = 0; k < len; k++) {
          resPoints.push({ x: points[k].x, y: points[k].y });
        }
        result.push({ inner: c.inner, label: c.label, points: resPoints, initialCount: len });
        continue;
      }

      lst = [0, len - 1]; // always add first and last points
      stack = [{ first: 0, last: len - 1 }]; // first processed edge

      do {
        ids = stack.shift();
        if (ids.last <= ids.first + 1) {
          // no intermediate points
          continue;
        }

        maxd = -1.0; // max distance from point to current edge
        maxi = ids.first; // index of maximally distant point

        for (
          i = ids.first + 1;
          i < ids.last;
          i++ // bypass intermediate points in edge
        ) {
          // calc the distance from current point to edge
          pi = points[i];
          pf = points[ids.first];
          pl = points[ids.last];
          dx = pi.x - pf.x;
          dy = pi.y - pf.y;
          r1 = Math.sqrt(dx * dx + dy * dy);
          dx = pi.x - pl.x;
          dy = pi.y - pl.y;
          r2 = Math.sqrt(dx * dx + dy * dy);
          dx = pf.x - pl.x;
          dy = pf.y - pl.y;
          r12 = Math.sqrt(dx * dx + dy * dy);
          if (r1 >= Math.sqrt(r2 * r2 + r12 * r12)) dist = r2;
          else if (r2 >= Math.sqrt(r1 * r1 + r12 * r12)) dist = r1;
          else dist = Math.abs((dy * pi.x - dx * pi.y + pf.x * pl.y - pl.x * pf.y) / r12);

          if (dist > maxd) {
            maxi = i; // save the index of maximally distant point
            maxd = dist;
          }
        }

        if (maxd > simplifyTolerant) {
          // if the max "deviation" is larger than allowed then...
          lst.push(maxi); // add index to the simplified list
          stack.push({ first: ids.first, last: maxi }); // add the left part for processing
          stack.push({ first: maxi, last: ids.last }); // add the right part for processing
        }
      } while (stack.length > 0);

      resPoints = [];
      len = lst.length;
      lst.sort(function(a, b) {
        return a - b;
      }); // restore index order
      for (k = 0; k < len; k++) {
        resPoints.push({ x: points[lst[k]].x, y: points[lst[k]].y }); // add result points to the correct order
      }
      result.push({ inner: c.inner, label: c.label, points: resPoints, initialCount: c.points.length });
    }

    return result;
  };

  return lib;
})();

/**
 * Given some mask with non-zero values indicating pixels to color, draws it on the given
 * canvas Context.
 * @param ctx Canvas 2D context to use for drawing the image data.
 * @param w When creating an image from the mask, the width of that image.
 * @param h When creating an image from the mask, the height of that image.
 * @param color Chroma.js compatible RGB color to use when drawing the mask.
 * @param alpha Float 0 to 1 value of how much opacity to use for thresholded, filled pixels.
 */ 
function paint(ctx, w, h, mask, color, alpha) {
  if (!mask) return;
  
  const [r, g, b] = chroma(color).rgb();

  alpha = Math.round(alpha * 255.0);

  let x, y;
  const { data, bounds, width: maskW } = mask;
  const imgData = ctx.createImageData(w, h);

  for (y = bounds.minY; y <= bounds.maxY; y++) {
    for (x = bounds.minX; x <= bounds.maxX; x++) {
      if (data[y * maskW + x] === 0) continue;
      let k = (y * w + x) * 4;

      imgData.data[k] = r;
      imgData.data[k + 1] = g;
      imgData.data[k + 2] = b;
      imgData.data[k + 3] = alpha;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Given some image, apply a threshold to it anchored at the x and y location, and also
 * draw a results border around the thresholded mask.
 * @param {ImageData} imageData Raw image data to do the thresholding on.
 * @param {CanvasRenderingContext2D} ctx Image context on which to draw the results.
 * @param {int} width of the image.
 * @param {int} height of the image.
 * @param {int} x of start pixel
 * @param {int} y of start pixel.
 * @param {int} threshold Color range around anchor pixel to include within mask.
 * @param {string} color The color to draw the mask as, passed in as an RGB string.
 * @param {float} alpha Alpha opacity of the mask when drawn, 0. to 1.
 * @param {boolean} doPaint Whether to draw the mask once its calculated; not drawing
 *  it can save some performance time.
 * @param {int} blurRadius The degree of gaussian blur to apply to the contour.
 * @param {boolean} doPaint Whether to draw the mask once its calculated; not drawing
 *  it can save some performance time.
 * @returns The mask as {Uint8Array} data, {int} width, {int} height, {Object} bounds.
 */
export function drawMask(imageData, ctx, width, height, x, y, threshold, color, alpha, blurRadius, doPaint) {
  const image = {
    data: imageData.data,
    width,
    height,
    bytes: 4, // RGBA
  };
  const existingMask = null;
  let mask = MagicWand.floodFill(image, x, y, threshold, existingMask);

  if (mask) mask = MagicWand.gaussBlurOnlyBorder(mask, blurRadius, existingMask);
  if (doPaint) paint(ctx, width, height, mask, color, alpha);

  return mask;
}
