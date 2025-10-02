import webfft from "webfft";
import { applyWindowFunction, type WindowFunctionType } from "../Visual/WindowFunctions";
import { BarkBanks } from "./BarkBanks";
import { MelBanks } from "./MelBanks";
import { SPECTROGRAM_DEFAULTS } from "../Visual/constants";

export type SpectrogramScale = "linear" | "log" | "mel" | "bark" | "perceptual";

export interface FFTProcessorOptions {
  fftSamples: number;
  windowingFunction: WindowFunctionType;
  sampleRate?: number;
}

/**
 * Handles the core FFT calculations, windowing, and Mel scale conversion.
 */
export class FFTProcessor {
  private options: FFTProcessorOptions;
  private webfftInstance: webfft | null = null;

  // Added a cache for MelBanks instances to avoid recreating them constantly
  private melBanksCache: MelBanks | null = null;
  private melBanksCacheKey: string | null = null;

  // Added a cache for BarkBanks instances to avoid recreating them constantly
  private barkBanksCache: BarkBanks | null = null;
  private barkBanksCacheKey: string | null = null;

  // Persistent buffers for performance
  private fftInputBuffer: Float32Array | null = null;
  private fftInterleavedInputBuffer: Float32Array | null = null;

  constructor(options: FFTProcessorOptions) {
    this.options = {
      ...options,
      fftSamples: options.fftSamples || SPECTROGRAM_DEFAULTS.FFT_SAMPLES,
      windowingFunction: options.windowingFunction || "hann",
    };
    this.initialize();
  }

  private initialize() {
    try {
      this.webfftInstance = new webfft(this.options.fftSamples);
      // Run profiling immediately after initialization
      (this.webfftInstance as any).profile();

      // Pre-allocate buffers
      this.fftInputBuffer = new Float32Array(this.options.fftSamples);
      // webfft might need interleaved input (real, imag, real, imag, ...)
      this.fftInterleavedInputBuffer = new Float32Array(this.options.fftSamples * 2);
    } catch (_error) {
      this.webfftInstance = null;
      this.fftInputBuffer = null;
      this.fftInterleavedInputBuffer = null;
    }
  }

  /**
   * Updates FFT parameters. Re-initializes FFT instance and Mel filterbank if necessary.
   */
  updateParameters(newOptions: Partial<FFTProcessorOptions>) {
    const needsReinitialization = newOptions.fftSamples && newOptions.fftSamples !== this.options.fftSamples;
    // Check if the sampleRate changed, as it affects MelBanks
    const needsMelCacheClear = newOptions.sampleRate && newOptions.sampleRate !== this.options.sampleRate;

    this.options = { ...this.options, ...newOptions };

    if (needsReinitialization) {
      this.webfftInstance?.dispose(); // Clean up old instance if exists
      this.initialize(); // Re-initialize with a new size
      this.melBanksCache = null; // Clear MelBanks cache if FFT size changes
      this.melBanksCacheKey = null;
      this.barkBanksCache = null; // Clear BarkBanks cache if FFT size changes
      this.barkBanksCacheKey = null;
    } else if (needsMelCacheClear) {
      this.melBanksCache = null; // Clear MelBanks cache if the sample rate changes
      this.melBanksCacheKey = null;
      this.barkBanksCache = null; // Clear BarkBanks cache if the sample rate changes
      this.barkBanksCacheKey = null;
    }
  }

  /**
   * Calculates the power spectrum for a given audio buffer segment.
   * Applies windowing function before FFT.
   * Handles potential errors during FFT calculation.
   *
   * @param buffer The input audio data segment.
   * @returns The power spectrum (magnitude) or null if FFT failed.
   */
  calculatePowerSpectrum(buffer: Float32Array): Float32Array | null {
    if (!this.webfftInstance || !this.fftInputBuffer || !this.fftInterleavedInputBuffer || buffer.length === 0) {
      return this.handleFFTError();
    }

    // Ensure the input buffer has the correct data, applying windowing
    // Use slice(0, fftSamples) in case the input buffer is longer
    const inputSlice = buffer.slice(0, this.options.fftSamples);

    // Copy sliced data into the pre-allocated buffer
    // Pad with zeros if inputSlice is shorter than fftSamples
    this.fftInputBuffer.set(inputSlice);
    if (inputSlice.length < this.options.fftSamples) {
      this.fftInputBuffer.fill(0, inputSlice.length);
    }

    // Now apply the window function IN-PLACE to the fftInputBuffer
    applyWindowFunction(this.fftInputBuffer, this.options.windowingFunction);

    try {
      // Prepare interleaved input for webfft (assuming real input)
      for (let i = 0; i < this.options.fftSamples; i++) {
        this.fftInterleavedInputBuffer[2 * i] = this.fftInputBuffer[i]; // Real part (now correctly windowed)
        this.fftInterleavedInputBuffer[2 * i + 1] = 0; // Imaginary part
      }

      // Perform FFT
      const fftResult = this.webfftInstance.fft(this.fftInterleavedInputBuffer);

      // Add a check for a valid FFT result
      if (!fftResult) {
        console.error("WebFFT returned invalid result", fftResult);
        return this.handleFFTError();
      }

      // Cast the result after the check using any as a workaround
      const validFftResult = fftResult as any;

      // Calculate magnitude (power spectrum)
      // Output is complex (real, imag), we need sqrt(real^2 + imag^2)
      // Result is half the size + 1 (due to symmetry)
      const spectrumSize = this.options.fftSamples / 2 + 1;
      const powerSpectrum = new Float32Array(spectrumSize);
      const normFactor = this.options.fftSamples; // Normalization factor (FFT size)

      // Handle DC component (index 0)
      const dcReal = validFftResult[0];
      powerSpectrum[0] = Math.abs(dcReal) / normFactor;

      // Handle remaining bins up to Nyquist
      for (let i = 1; i < spectrumSize; i++) {
        const real = validFftResult[2 * i];
        const imag = validFftResult[2 * i + 1];
        // Normalize the magnitude
        // Note: Standard normalization often uses N for power, 2/N for amplitude spectrum (excluding DC/Nyquist)
        // We are calculating power (magnitude squared implicitly via dB conversion later),
        // but normalizing magnitude by N here is common before dB.
        powerSpectrum[i] = Math.sqrt(real * real + imag * imag) / normFactor;
      }

      return powerSpectrum;
    } catch (error) {
      console.error("Error during FFT calculation:", error);
      return this.handleFFTError();
    }
  }

  /**
   * Converts a linear power spectrum to the Mel scale using the MelBanks class.
   *
   * @param linearSpectrum The input power spectrum.
   * @param numberOfMelBands The desired number of Mel bands for this conversion.
   * @returns The Mel scaled spectrum or null if parameters are missing/invalid.
   */
  convertToMelScale(linearSpectrum: Float32Array, numberOfMelBands: number): Float32Array | null {
    if (!this.options.sampleRate) {
      console.warn("Sample rate required for Mel scale conversion.");
      return null;
    }
    if (numberOfMelBands <= 0) {
      console.warn("Number of Mel bands must be positive.");
      return null;
    }

    const linearBinCount = linearSpectrum.length;
    const currentKey = `${this.options.sampleRate}-${linearBinCount}-${numberOfMelBands}`;

    // Check cache
    if (!this.melBanksCache || this.melBanksCacheKey !== currentKey) {
      try {
        this.melBanksCache = new MelBanks(this.options.sampleRate, linearBinCount, numberOfMelBands);
        this.melBanksCacheKey = currentKey;
      } catch (error) {
        console.error("Failed to create MelBanks instance:", error);
        this.melBanksCache = null;
        this.melBanksCacheKey = null;
        return null;
      }
    }

    // Apply the filter bank using the cached instance
    try {
      return this.melBanksCache.applyFilterbank(linearSpectrum);
    } catch (error) {
      console.error("Error applying Mel filterbank:", error);
      return null;
    }
  }

  /**
   * Converts a linear power spectrum to the Bark scale using the BarkBanks class.
   *
   * @param linearSpectrum The input power spectrum.
   * @param numberOfBarkBands The desired number of Bark bands for this conversion.
   * @returns The Bark scaled spectrum or null if parameters are missing/invalid.
   */
  convertToBarkScale(linearSpectrum: Float32Array, numberOfBarkBands: number): Float32Array | null {
    if (!this.options.sampleRate) {
      console.warn("Sample rate required for Bark scale conversion.");
      return null;
    }
    if (numberOfBarkBands <= 0) {
      console.warn("Number of Bark bands must be positive.");
      return null;
    }

    const linearBinCount = linearSpectrum.length;
    const currentKey = `${this.options.sampleRate}-${linearBinCount}-${numberOfBarkBands}`;

    // Check cache
    if (!this.barkBanksCache || this.barkBanksCacheKey !== currentKey) {
      try {
        this.barkBanksCache = new BarkBanks(this.options.sampleRate, linearBinCount, numberOfBarkBands);
        this.barkBanksCacheKey = currentKey;
      } catch (error) {
        console.error("Failed to create BarkBanks instance:", error);
        this.barkBanksCache = null;
        this.barkBanksCacheKey = null;
        return null;
      }
    }

    // Apply the filter bank using the cached instance
    try {
      return this.barkBanksCache.applyFilterbank(linearSpectrum);
    } catch (error) {
      console.error("Error applying Bark filterbank:", error);
      return null;
    }
  }

  /**
   * Returns a fallback array when FFT calculation fails.
   */
  private handleFFTError(): Float32Array | null {
    // Return null to indicate failure, let the caller decide on fallback
    return null;
  }

  /**
   * Cleans up the WebFFT instance.
   */
  dispose() {
    this.webfftInstance?.dispose();
    this.webfftInstance = null;
    this.fftInputBuffer = null;
    this.fftInterleavedInputBuffer = null;
    this.melBanksCache = null; // Clear cache on dispose
    this.melBanksCacheKey = null;
    this.barkBanksCache = null; // Clear cache on dispose
    this.barkBanksCacheKey = null;
  }

  // Getter for FFT samples size
  get fftSamples(): number {
    return this.options.fftSamples;
  }
}
