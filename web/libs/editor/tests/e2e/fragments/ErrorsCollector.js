const { I } = inject();

function startErrorsCollector() {
  function CEErrorsCollector() {
    this.errors = [];
    this.errorHandler = this.errorHandler.bind(this);
    this._start();
  }

  CEErrorsCollector.prototype.errorHandler = function(ev)  {
    // Ignore not meaningful error
    if (ev.message === 'ResizeObserver loop limit exceeded') return;

    this.errors.push(ev.message);
  };
  CEErrorsCollector.prototype.destroy = function() {
    this.errors = null;
    this._finish();
  };
  CEErrorsCollector.prototype._start = function()  {
    window.addEventListener('error', this.errorHandler);
  };
  CEErrorsCollector.prototype._finish = function()  {
    window.removeEventListener('error', this.errorHandler);
  };
  window._ceErrorsCollector = new CEErrorsCollector();
}

function stopErrorsCollector() {
  window._ceErrorsCollector.destroy();
}

function getErrors() {
  return window._ceErrorsCollector.errors;
}

module.exports = {
  run() {
    I.executeScript(startErrorsCollector);
  },
  stop() {
    I.executeScript(stopErrorsCollector);
  },
  async grabErrors() {
    const errors = await I.executeScript(getErrors);

    return errors;
  },
};
