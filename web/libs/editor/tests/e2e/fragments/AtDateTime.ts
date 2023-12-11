const { I } = inject();

module.exports = {
  _dateInputId: '__test_date_format__',
  /**
   * Browsers use system date format for input[type=date], not locale,
   * and inputs don't provide any API to get this format or user input,
   * only the final value in ISO format.
   * So we fill in some specific input and check the result.
   * Depending on system settings, entered digits can go to different places,
   * generating one of 4 possible date formats —year can only be at the beginning
   * or at the end.
   * We focus only on formats with full numeric day, month and year (DD and YYYY).
   * @returns {Promise<string>} date format of y, m, d (e.g. 'ymd')
   */
  async detectDateFormat() {
    // create invisible date input
    await I.executeScript(({ id }) => {
      const date = document.createElement('input');

      date.type = 'date';
      date.id = id;
      Object.assign(date.style, {
        position: 'absolute',
        top: 0,
        opacity: 0,
      });

      document.body.appendChild(date);
    }, { id: this._dateInputId });

    I.fillField(`#${this._dateInputId}`, '01020304');

    const format = await I.executeScript(({ id }) => {
      const date = document.getElementById(id) as HTMLInputElement;
      const value = date.value; // always ISO format
      
      switch (value) {
        case '0102-04-03': return 'ydm';
        case '0102-03-04': return 'ymd';
        case '0304-02-01': return 'dmy';
        case '0304-01-02': return 'mdy';
        default: return 'ymd';
      }
    }, { id: this._dateInputId });

    // remove this input
    await I.executeScript(({ id }) => {
      (document.getElementById(id) as HTMLInputElement).remove();
    }, { id: this._dateInputId });

    return format;
  },
};
