export class Loader extends HTMLElement {
  _loaded: number;
  _total: number;
  _initializing = false;
  _error = '';

  constructor() {
    super();
    this._loaded = 0;
    this._total = 0;

    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          width: 100%;
          height: var(--ls-loader-height, calc(100% - var(--ls-loader-offset, 34px)));
          position: absolute;
          top: var(--ls-loader-offset, 34px);
          left: 0;
          z-index: 9999;
          justify-content: center;
          align-items: center;
          background-color: var(--ls-loader-background-color, #fafafa);
          pointer-events: none;
        }
        :host([hidden]) {
          display: none;
        }
        .progress {
          width: 70%;
        }
        .progress-bar {
          overflow: hidden;
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          background-color: var(--ls-loader-color, rgba(65, 60, 74, 0.08));
          border-radius: var(--ls-loader-progress-border-radius, 8px);
          height: var(--ls-loader-progress-height, 8px);
        }
        .progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          height: 100%;
          width: 100%;
          border-radius: var(--ls-loader-progress-border-radius, 8px);
          background-color: var(--ls-loader-progress-color, rgba(105, 192, 255, 1));
          transition: transform 0.15s ease;
          transform-origin: left;
          transform: translateX(var(--ls-loader-position, -100%));
        }
        .progress-bar-indeterminate::after {
          transform: translateX(0);
          animation: shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .progress-bar-info {
          display: flex;
          justify-content: space-between;
          color: var(--ls-loader-text-color, rgba(137, 128, 152, 1));
        }
        .progress-bar-text {
          display: flex;
        }
        .progress-bar-totals {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .progress-text {
          font-size: 9px;
          line-height: 16px;
          letter-spacing: 0.5px;
          font-weight: 500;
          margin: 0;
        }
        .error {
          color: var(--ls-loader-error-color, rgba(207, 19, 34, 1));
        }
        @keyframes shimmer {
          50% {
            opacity: 0.5;
          }
        }
      </style>
      <div class="progress">
        <div class="progress-bar-info">
          <div class="progress-bar-text">
            <h3 id="text" class="progress-text">Loading file...</h3>
          </div>
          <div class="progress-bar-totals progress-text">
            <span id="loaded">0.0 MB</span><span id="percentage">(0)%</span><span>of</span><span id="total">?? MB</span>
          </div>
        </div>
        <div class="progress-bar"></div>
      </div>
    `;
  }

  get error() {
    return this._error;
  }

  set error(value: string) {
    this._error = value;
  }

  get loaded() {
    return this._loaded;
  }

  set loaded(value: number) {
    this._loaded = value;
  }

  get total() {
    return this._total;
  }

  set total(value: number) {
    this._total= value;
  }

  get value() {
    return Math.round(this.loaded / this.total * 100);
  }

  convertBytesToMegabytes(bytes: number) {
    return (bytes / 1024 / 1024).toFixed(1);
  }

  update() {
    if (!this.shadowRoot) return;

    const bar = this.shadowRoot.querySelector('.progress-bar') as HTMLElement;
    const text = this.shadowRoot.querySelector('#text') as HTMLElement;
    const loadedText = this.shadowRoot.querySelector('#loaded') as HTMLElement;
    const totalText = this.shadowRoot.querySelector('#total') as HTMLElement;
    const percentageText = this.shadowRoot.querySelector('#percentage') as HTMLElement;

    if (!bar) return;

    const total = this.total;

    requestAnimationFrame(() => {
      // If an error occurred, show the error message and hide the progress bar
      if (this._error) {
        if (!text.classList.contains('error')) {
          text.classList.add('error');
        }
        text.innerText = this._error;
        return;
      }
      // Update the progress bar for decoding of chunks
      if (this._initializing) {
        loadedText.innerText = `${this.loaded}`;
        totalText.innerText = `${this.total} chunks`;
        percentageText.innerText = `(${this.value}%)`;
        return;
      }

      // Indeterminate progress bar is given if no calculable total available.
      if (total < 0) {
        if (!bar.classList.contains('progress-bar-indeterminate')) 
          bar.classList.add('progress-bar-indeterminate');

        if (this.loaded > 0) {
          loadedText.innerText = `${this.convertBytesToMegabytes(this.loaded)} MB`;
        }
        return;
      }

      const value = this.value;

      // Finished loading, starting initialization
      if (value === 100) {
        this._initializing = true;
        if (this.total > 0) {
          loadedText.innerText = `${this.convertBytesToMegabytes(this.loaded)} MB`;
          totalText.innerText = `${this.convertBytesToMegabytes(this.total)} MB`;
          percentageText.innerText = `(${value}%)`;
        }
        text.innerText = 'Initializing...';
        bar.classList.add('progress-bar-indeterminate');
        return;
      }

      // Update progress bar
      bar.style.setProperty('--ls-loader-position', `${value - 100}%`);
      if (value > 0) {
        percentageText.innerText = `(${value}%)`;
      }
      if (this.loaded > 0) {
        loadedText.innerText = `${this.convertBytesToMegabytes(this.loaded)} MB`;
      }
      if (this.total > 0) {
        totalText.innerText = `${this.convertBytesToMegabytes(this.total)} MB`;
      }
    });
  }

  static get observedAttributes() {
    return ['hidden'];
  }
}

customElements.define('loading-progress-bar', Loader);
