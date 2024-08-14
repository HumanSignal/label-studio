class TimeSeriesHelper {
  private get _baseRootSelector() {
    return ".htx-timeseries";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }
}

const TimeSeries = new TimeSeriesHelper("&:eq(0)");
const useTimeSeries = (rootSelector: string) => {
  return new TimeSeriesHelper(rootSelector);
};

export { TimeSeries, useTimeSeries };
