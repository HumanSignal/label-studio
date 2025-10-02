import { HYBRID_LINEAR_DOWNSAMPLE_SPLIT } from "../constants";

/**
 * Downsample FFT data for the linear scale by hybrid pooling (average for low bins, max for high bins)
 * @param fftData
 * @param bins
 */
export function downsampleLinear(fftData: Float32Array, bins: number): Float32Array {
  const binCount = fftData.length;
  if (bins >= binCount) return fftData;
  const groupSize = Math.floor(binCount / bins);
  const result = new Float32Array(bins);
  const split = Math.floor(bins * HYBRID_LINEAR_DOWNSAMPLE_SPLIT);
  for (let i = 0; i < bins; i++) {
    if (i < split) {
      // Average for low bins
      let sum = 0;
      for (let j = 0; j < groupSize; j++) {
        sum += fftData[i * groupSize + j];
      }
      result[i] = sum / groupSize;
    } else {
      // Max for high bins
      let max = Number.NEGATIVE_INFINITY;
      for (let j = 0; j < groupSize; j++) {
        max = Math.max(max, fftData[i * groupSize + j]);
      }
      result[i] = max;
    }
  }
  return result;
}

/**
 * Downsample FFT data for perceptual scale by hybrid pooling
 * @param fftData
 * @param bins
 */
export function downsamplePerceptual(fftData: Float32Array, bins: number): Float32Array {
  const binCount = fftData.length;
  if (bins >= binCount) return fftData;
  const result = new Float32Array(bins);
  // A different logarithmic base for a different perceptual scale
  const logMin = Math.log(2);
  const logMax = Math.log(binCount + 2);

  for (let i = 0; i < bins; i++) {
    let startF = Math.floor(Math.exp(logMin + (logMax - logMin) * (i / bins)) - 2);
    let endF = Math.floor(Math.exp(logMin + (logMax - logMin) * ((i + 1) / bins)) - 2);
    // Clamp to valid range
    startF = Math.max(0, startF);
    endF = Math.max(startF + 1, endF); // Ensure at least one bin
    let sum = 0;
    let max = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (let j = startF; j < endF && j < binCount; j++) {
      sum += fftData[j];
      max = Math.max(max, fftData[j]);
      count++;
    }
    if (count === 0) {
      result[i] = fftData[0];
    } else {
      // Hybrid approach: average for lower frequencies, max for higher
      result[i] = i < bins * HYBRID_LINEAR_DOWNSAMPLE_SPLIT ? sum / count : max;
    }
  }
  return result;
}

/**
 * Downsample FFT data for Bark scale by averaging bins within a kernel
 * @param fftData
 * @param bins
 */
export function downsampleBark(fftData: Float32Array, bins: number): Float32Array {
  const binCount = fftData.length;
  if (bins >= binCount) return fftData;
  const kernelSize = Math.floor(binCount / bins);
  const result = new Float32Array(bins);
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    let count = 0;
    // Center the kernel on the target bin
    const center = Math.floor(((i + 0.5) * binCount) / bins);
    const start = Math.max(0, center - Math.floor(kernelSize / 2));
    const end = Math.min(binCount, center + Math.ceil(kernelSize / 2));
    for (let j = start; j < end; j++) {
      sum += fftData[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

/**
 * Downsample FFT data for log scale by hybrid pooling (average for low bins, max for high bins)
 * @param fftData
 * @param bins
 */
export function downsampleLog(fftData: Float32Array, bins: number): Float32Array {
  const binCount = fftData.length;
  if (bins >= binCount) return fftData;
  const result = new Float32Array(bins);
  const logMin = Math.log(1);
  const logMax = Math.log(binCount + 1);

  for (let i = 0; i < bins; i++) {
    let startF = Math.floor(Math.exp(logMin + (logMax - logMin) * (i / bins)) - 1);
    let endF = Math.floor(Math.exp(logMin + (logMax - logMin) * ((i + 1) / bins)) - 1);
    // Clamp to valid range
    startF = Math.max(0, startF);
    endF = Math.max(startF + 1, endF); // Ensure at least one bin
    let sum = 0;
    let max = Number.NEGATIVE_INFINITY;
    let count = 0;
    for (let j = startF; j < endF && j < binCount; j++) {
      sum += fftData[j];
      max = Math.max(max, fftData[j]);
      count++;
    }
    if (count === 0) {
      // For the first bin, use fftData[0]
      result[i] = fftData[0];
    } else {
      result[i] = i < bins * HYBRID_LINEAR_DOWNSAMPLE_SPLIT ? sum / count : max;
    }
  }
  return result;
}

/**
 * Downsample FFT data for Mel scale by averaging bins within a kernel
 * @param fftData
 * @param bins
 */
export function downsampleMel(fftData: Float32Array, bins: number): Float32Array {
  const binCount = fftData.length;
  if (bins >= binCount) return fftData;
  const kernelSize = Math.floor(binCount / bins);
  const result = new Float32Array(bins);
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    let count = 0;
    // Center the kernel on the target bin
    const center = Math.floor(((i + 0.5) * binCount) / bins);
    const start = Math.max(0, center - Math.floor(kernelSize / 2));
    const end = Math.min(binCount, center + Math.ceil(kernelSize / 2));
    for (let j = start; j < end; j++) {
      sum += fftData[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}
