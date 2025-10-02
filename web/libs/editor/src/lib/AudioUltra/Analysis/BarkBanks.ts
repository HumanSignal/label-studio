/**
 * Handles the creation and application of Bark filter banks for audio analysis.
 */
export class BarkBanks {
  private filterbank: number[][];
  private numBands: number;

  /**
   * Initializes the BarkBanks instance and creates the filterbank.
   *
   * @param sampleRate - The sample rate of the audio.
   * @param linearBinCount - The number of frequency bins in the linear spectrum (fftSize / 2 + 1).
   * @param numBands - The desired number of Bark bands.
   */
  constructor(sampleRate: number, linearBinCount: number, numBands: number) {
    if (numBands <= 0) {
      console.warn("Number of Bark bands must be positive.");
      // Provide a default empty filterbank to avoid errors later
      this.filterbank = [];
      this.numBands = 0;
    } else {
      this.numBands = numBands;
      this.filterbank = this.createBarkFilterbank(sampleRate, linearBinCount, numBands);
    }
  }

  /**
   * Applies the pre-calculated Bark filter bank to a linear power spectrum.
   *
   * @param linearSpectrum - The input linear power spectrum (magnitudes).
   * @returns The spectrum converted to the Bark scale.
   */
  applyFilterbank(linearSpectrum: Float32Array): Float32Array {
    if (this.filterbank.length === 0 || this.numBands === 0) {
      console.warn("Bark filter bank not initialized or invalid.");
      // Return an empty or zero-filled array matching the expected band count
      return new Float32Array(this.numBands).fill(0);
    }

    // Ensure the filter bank bin count matches linear spectrum length
    if (this.filterbank.length > 0 && this.filterbank[0].length !== linearSpectrum.length) {
      console.error(
        `Bark filter bank bin count (${this.filterbank[0].length}) does not match linear spectrum length (${linearSpectrum.length}). Recreate BarkBanks instance.`,
      );
      return new Float32Array(this.numBands).fill(0);
    }

    const barkSpectrum = new Float32Array(this.numBands).fill(0);
    for (let i = 0; i < this.numBands; i++) {
      const filter = this.filterbank[i];
      // filter bank[0].length should equal linearSpectrum.length due to check above
      for (let j = 0; j < filter.length; j++) {
        barkSpectrum[i] += linearSpectrum[j] * filter[j];
      }
      // Add a small epsilon to avoid log(0) if further log scaling is applied later
      barkSpectrum[i] = barkSpectrum[i] > 0 ? barkSpectrum[i] : 1e-10;
    }

    return barkSpectrum;
  }

  /**
   * Converts frequency in Hz to Bark scale.
   */
  private hzToBark(hz: number): number {
    return 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan(Math.pow(hz / 7500, 2));
  }

  /**
   * Converts Bark scale value back to frequency in Hz.
   */
  private barkToHz(bark: number): number {
    // This is an approximation and may not be perfectly accurate.
    // It's a simplified inverse of the hzToBark formula.
    // A more accurate inverse would require numerical methods.
    return 1960 * (0.53 + bark) / (26.28 - bark);
  }

  /**
   * Creates a Bark filter bank matrix.
   */
  private createBarkFilterbank(sampleRate: number, linearBinCount: number, numBands: number): number[][] {
    // Basic parameter validation
    if (numBands <= 0 || linearBinCount <= 1 || sampleRate <= 0) {
      console.warn("Invalid parameters for Bark filterbank creation.");
      return [];
    }

    const lowFreqBark = 0;
    const highFreqBark = this.hzToBark(sampleRate / 2);

    // Check for degenerate Bark range
    if (lowFreqBark >= highFreqBark) {
      console.warn("Min Bark frequency is not less than Max Bark frequency.");
      return [];
    }

    const barkPoints = new Float32Array(numBands + 2);
    const barkStep = (highFreqBark - lowFreqBark) / (numBands + 1);

    // Check for a non-positive Bark step
    if (barkStep <= 0) {
      console.warn("Calculated Bark step is not positive.");
      return [];
    }

    // Create evenly spaced points in a Bark scale
    for (let i = 0; i < numBands + 2; i++) {
      barkPoints[i] = lowFreqBark + i * barkStep;
    }

    const hzPoints: Float32Array = barkPoints.map((bark) => this.barkToHz(bark));
    // Calculate the frequency resolution of the linear FFT bins
    const freqResolution: number = sampleRate / (2 * (linearBinCount - 1));
    const binFreqs: Float32Array = new Float32Array(linearBinCount).map((_, i) => i * freqResolution);

    const filterbank: number[][] = [];
    for (let i = 0; i < numBands; i++) {
      const filter = new Array(linearBinCount).fill(0);
      const leftHz = hzPoints[i];
      const centerHz = hzPoints[i + 1];
      const rightHz = hzPoints[i + 2];

      // Check for non-positive frequency steps which cause division by zero
      const leftDelta = centerHz - leftHz;
      const rightDelta = rightHz - centerHz;

      // Handle degenerate filters where the triangle collapses due to discretization
      if (leftDelta <= 0 || rightDelta <= 0) {
        // Visual Fix: Instead of a zero-energy filter (causing a dark line
        // in the spectrogram), assign a weight of 1.0 to the single FFT bin
        // closest to the center frequency. This passes the energy from that bin
        // through, avoiding the artifact, although it's not true Bark filtering
        // for this specific band.
        console.warn(
          `Degenerate filter shape detected for Bark band ${i} (center: ${centerHz.toFixed(
            2,
          )} Hz). Applying visual fix.`,
        );
        // Find the bin index closest to the center frequency
        const targetBinIndex = Math.round(centerHz / freqResolution);
        // Ensure the index is within bounds
        const clampedBinIndex = Math.max(0, Math.min(linearBinCount - 1, targetBinIndex));
        if (clampedBinIndex >= 0 && clampedBinIndex < linearBinCount) {
          filter[clampedBinIndex] = 1.0;
        }
        // No need to continue; push the filter with the single '1'
      } else {
        // Normal filter calculation for non-degenerate triangles
        for (let j = 0; j < linearBinCount; j++) {
          const freq = binFreqs[j];
          // Rising slope
          if (freq >= leftHz && freq <= centerHz) {
            filter[j] = (freq - leftHz) / leftDelta;
          }
          // Falling slope
          else if (freq > centerHz && freq <= rightHz) {
            filter[j] = (rightHz - freq) / rightDelta;
          }
        }
      }
      filterbank.push(filter);
    }
    return filterbank;
  }
}