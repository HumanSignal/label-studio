import * as d3 from 'd3';
import React, { useState } from 'react';
import { inject, observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import InfoModal from '../../components/Infomodal/Infomodal';
import { guidGenerator } from '../../core/Helpers';
import Registry from '../../core/Registry';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import PerRegionMixin from '../../mixins/PerRegion';
import RequiredMixin from '../../mixins/Required';
import { isDefined } from '../../utils/utilities';
import ControlBase from './Base';
import { ReadOnlyControlMixin } from '../../mixins/ReadOnlyMixin';
import ClassificationBase from './ClassificationBase';
import PerItemMixin from '../../mixins/PerItem';
import { FF_LSDV_4583, isFF } from '../../utils/feature-flags';

const FORMAT_FULL = '%Y-%m-%dT%H:%M';
const FORMAT_DATE = '%Y-%m-%d';
const FORMAT_TIME = '%H:%M';

const ISO_DATE_SEPARATOR = 'T';

const zero = n => (n < 10 ? '0' : '') + n;

/**
 * The DateTime tag adds date and time selection to the labeling interface. Use this tag to add a date, timestamp, month, or year to an annotation.
 *
 * Use with the following data types: audio, image, HTML, paragraph, text, time series, video
 *
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality
 *
 * @example
 * <View>
 *   <Text name="txt" value="$text" />
 *   <DateTime name="datetime" toName="txt" only="date" />
 * </View>
 *
 * @name DateTime
 * @param {string} name              - Name of the element
 * @param {string} toName            - Name of the element that you want to label
 * @param {string} only              - Comma-separated list of parts to display (date, time, month, year)
 *        date and month/year can't be used together. The date option takes precedence
 * @param {string} format            - Input/output strftime format for datetime (internally it's always ISO);
 *        when both date and time are displayed, by default shows ISO with a "T" separator;
 *        when only date is displayed, by default shows ISO date;
 *        when only time is displayed, by default shows a 24 hour time with leading zero
 * @param {string} [min]             - Set a minimum datetime value for only=date in ISO format, or minimum year for only=year
 * @param {string} [max]             - Set a maximum datetime value for only=date in ISO format, or maximum year for only=year
 * @param {boolean} [required=false] - Whether datetime is required or not
 * @param {string} [requiredMessage] - Message to show if validation fails
 * @param {boolean} [perRegion]      - Use this option to label regions instead of the whole object
 * @param {boolean} [perItem]        - Use this option to label items inside the object instead of the whole object[^FF_LSDV_4583]
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  format: types.maybeNull(types.string),
  only: types.maybeNull(types.string),
  min: types.maybeNull(types.string),
  max: types.maybeNull(types.string),
  step: types.maybeNull(types.string),
  defaultvalue: types.maybeNull(types.string),

  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    pid: types.optional(types.string, guidGenerator),
    type: 'datetime',
  })
  .views(self => ({
    selectedValues() {
      return self.datetime;
    },

    get holdsState() {
      if (self.onlyTime && !isDefined(self.time)) return false;
      return isDefined(self.month) || isDefined(self.year);
    },

    get showDate() {
      return !self.only || self.only.includes('date');
    },

    get showTime() {
      return !self.only || self.only.includes('time');
    },

    get onlyTime() {
      return self.only === 'time';
    },

    get showMonth() {
      return self.only?.includes('month') && !self.only?.includes('date');
    },

    get showYear() {
      return self.only?.includes('year');
    },

    /**
     * Results store only formatted values and we need ISO for validation
     * @param {string} value already formatted value from result
     * @returns {string} ISO date
     */
    getISODate(value) {
      if (self.onlyYear) return value;
      if (self.onlyTime) return undefined;

      /** @type {Date} parsed date in local timezone */
      const date = self.parseDateTime(value);

      // we can't use toISOString() because it may shift timezone and return different day
      return [date.getFullYear(), zero(date.getMonth() + 1), zero(date.getDate())].join('-');
    },

    /**
     * @returns {string} current year or date in ISO format
     */
    get date() {
      if (self.only?.includes('year')) return self.year;
      if (!self.month || !self.year) return undefined;
      return [self.year, zero(self.month), zero(self.day)].join('-');
    },

    /**
     * @returns {string} main value stored in result, already formatted
     */
    get datetime() {
      const timeStr = self.time || '00:00';

      if (self.onlyTime) return timeStr;
      if (!self.date) {
        if (self.year) return self.year;
        return undefined;
      }

      const date = new Date(self.date + ISO_DATE_SEPARATOR + timeStr);

      return self.formatDateTime(date);
    },

    get isValid() {
      if (self.min && self.date < self.min) return false;
      if (self.max && self.date > self.max) return false;
      return true;
    },
  }))
  .volatile(() => ({
    updateValue: false,
    day: undefined,
    month: undefined,
    year: undefined,
    time: undefined,
  }))
  .volatile(self => {
    let format;

    if (self.onlyTime) format = String;
    // don't format only=time
    else if (self.format) format = self.format;
    else if (!self.showTime) format = FORMAT_DATE;
    else format = FORMAT_FULL;

    return {
      formatTime: d3.timeFormat(FORMAT_TIME),
      formatDateTime: d3.timeFormat(format),
      parseDateTime: d3.timeParse(format),
    };
  })
  .volatile(self => {
    const years = [];
    const months = [];
    const monthName = d3.timeFormat('%B');
    const date = new Date();
    const getYear = minmax => {
      if (minmax === 'current') return date.getFullYear();
      if (minmax.length === 4) return minmax;
      return self.parseDateTime(minmax)?.getFullYear();
    };
    const minYear = getYear(self.min ?? '2000');
    const maxYear = getYear(self.max ?? 'current');

    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }

    // every month should have this day, so current day is bad:
    // on Oct 30th when you change month to February it resets to March
    date.setDate(1);
    for (let m = 0; m < 12; m++) {
      date.setMonth(m);
      months[m] = monthName(date);
    }

    return { months, years };
  })
  .actions(self => ({
    setNeedsUpdate(value) {
      self.updateValue = value;
    },

    needsUpdate() {
      self.setNeedsUpdate(true);
      if (self.result) {
        self.setDateTime(self.result.mainValue);
      } else {
        self.resetDateTime();
      }
    },

    unselectAll() {},

    resetDate() {
      self.day = undefined;
      self.month = undefined;
      self.year = undefined;
    },

    resetDateTime() {
      self.resetDate();
      self.time = undefined;
    },

    validDateFormat(dateString) {
      const dateNumberArray = dateString.split('-').map(dateString => parseInt(dateString, 10));
      const year = dateNumberArray[0];
      const isADate = !isNaN(new Date(dateString));
      const fourPositiveIntegersYear = year <= 9999 && year >= 1000;

      if (isADate && fourPositiveIntegersYear) return dateNumberArray;
      return false;
    },

    setDateTime(value) {
      if (self.onlyTime) {
        self.time = value;
        return;
      }

      const date = self.parseDateTime(value);

      if (!date) return self.resetDateTime();

      // @todo month and year inputs may need only one value to be set
      self.day = date.getDate();
      self.month = date.getMonth() + 1;
      self.year = date.getFullYear();

      if (self.showTime) {
        self.time = self.formatTime(date);
      }
    },

    onMonthChange(e) {
      self.month = +e.target.value || undefined;
      self.updateResult();
    },

    onYearChange(e) {
      self.year = +e.target.value || undefined;
      self.updateResult();
    },

    setDate(dateArray) {
      // forced to clear date fields
      if (!dateArray) {
        self.day = undefined;
        self.month = undefined;
        self.year = undefined;
      } else {
        self.day = dateArray[2];
        self.month = dateArray[1];
        self.year = dateArray[0];
      }
      self.updateResult();
    },

    onTimeChange(e) {
      self.time = e.target.value || undefined;
      self.updateResult();
    },

    updateFromResult() {
      this.needsUpdate();
    },

    requiredModal() {
      InfoModal.warning(self.requiredmessage || `DateTime "${self.name}" is required.`);
    },
  }))
  .actions(self => {
    const Super = { validateValue: self.validateValue };

    return {
      validateValue(value) {
        if (!Super.validateValue(value)) return false;

        const errors = [];

        if (!value) return true;

        let date = self.getISODate(value);

        if (self.only?.includes('year')) date = date.slice(0, 4);

        const { min, max } = self;

        if (min && date < min) errors.push(`min date is ${min}`);
        if (max && date > max) errors.push(`max date is ${max}`);

        if (errors.length) {
          InfoModal.warning(`Date "${date}" is not valid: ${errors.join(', ')}.`);
          return false;
        }
        return true;
      },
    };
  });

const DateTimeModel = types.compose(
  'DateTimeModel',
  ControlBase,
  ClassificationBase,
  RequiredMixin,
  ReadOnlyControlMixin,
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  AnnotationMixin,
  TagAttrs,
  Model,
);

const HtxDateTime = inject('store')(
  observer(({ item }) => {
    const disabled = item.isReadOnly();
    const visibleStyle = item.perRegionVisible() ? { margin: '0 0 1em' } : { display: 'none' };
    const visual = {
      style: { width: 'auto', marginRight: '4px', borderColor: item.isValid ? undefined : 'red' },
      className: 'ant-input',
    };
    const [minTime, maxTime] = [item.min, item.max].map(s => s?.match(/\d?\d:\d\d/)?.[0]);
    const [dateInputValue, setDateInputValue] = useState('');

    const handleDateInputValueChange = event => {
      const value = event.target.value;
      const validDateArray = item.validDateFormat(value);

      setDateInputValue(value);
      if (!value || validDateArray) item.setDate(validDateArray);
    };

    if (item.updateValue) {
      if (item.showDate && (item.date === undefined || item.date !== dateInputValue)) {
        setDateInputValue(item.date || '');
      }
      item.setNeedsUpdate(false);
    }

    const handleDateOnBlur = () => {
      const dateWasNotSaved = dateInputValue !== item.date;

      if (dateWasNotSaved) setDateInputValue(item.date || '');
    };

    return (
      <div className="htx-datetime" style={visibleStyle}>
        {item.showMonth && (
          <select
            {...visual}
            name={item.name + '-date'}
            disabled={disabled}
            value={item.month}
            onChange={disabled ? undefined : item.onMonthChange}
          >
            <option value="">Month...</option>
            {item.months.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        )}
        {item.showYear && (
          <select
            {...visual}
            name={item.name + '-year'}
            disabled={disabled}
            value={item.year || ''}
            onChange={disabled ? undefined : item.onYearChange}
          >
            <option value="">Year...</option>
            {item.years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
        {item.showDate && (
          <input
            {...visual}
            type="date"
            readOnly={disabled}
            name={item.name + '-date'}
            value={dateInputValue}
            min={item.min}
            max={item.max}
            onChange={disabled ? undefined : handleDateInputValueChange}
            onBlur={disabled ? undefined : handleDateOnBlur}
          />
        )}
        {item.showTime && (
          <input
            {...visual}
            type="time"
            readOnly={disabled}
            name={item.name + '-time'}
            value={item.time ?? ''}
            min={minTime}
            max={maxTime}
            onChange={disabled ? undefined : item.onTimeChange}
          />
        )}
      </div>
    );
  }),
);

Registry.addTag('datetime', DateTimeModel, HtxDateTime);

export { HtxDateTime, DateTimeModel };
