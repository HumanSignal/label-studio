
export class MaskUtil {
  input: HTMLInputElement;
  maskPattern: string;
  proxyChar: string;
  numValidate: any;
  stringValidate: any;
  mask: any;
  validators: any;
  placeholder: string;
  regExp: string;
  onChange: (value: string) => void;
  /**
   * Construct a new MaskUtil instance
   * @param {HTMLInputElement} input - The input to be masked
   * @param {string} pattern - The pattern to validate against
   * @param {string} proxyChar - The placeholder string
   */
  constructor(input:HTMLInputElement , pattern:string, onChange: (value: string) => void , proxyChar = '_') {
    this.input = input;
    this.maskPattern = pattern;
    this.proxyChar = proxyChar;
    this.onChange = onChange;
    /** Validation patterns */
    this.numValidate = /^\d$/;
    this.stringValidate = /^[a-zA-Z]$/;

    /**
     * Construct the mask object
     * @property { string } char - The validation character || required string
     * @property { RegExp } validator - The regular expression to validate against
     */
    this.mask = pattern.split('').map((char: any) => {
      let validator;

      if (char === 'A') {
        validator = this.stringValidate;
      } else if (char === '1') {
        validator = this.numValidate;
      }
      return { char, validator };
    });

    /** Only mask implementations that include validators */
    this.validators = this.mask.filter((charData: any) => charData.validator);

    /** Construct a default placeholder for use by component if one is not supplied */
    this.placeholder = this.mask.map((char: any) => {
      if (char.validator) {
        return this.proxyChar;
      } else {
        return char.char;
      }
    }).join('');

    /** Characters that need to be escaped */
    const escape = '\\^$*+?.()|{}[]'.split('');

    /** Construct a string to be used as a pattern setting in an input component */
    const regExp = this.mask.map((entry: any) => {
      const { validator, char } = entry;

      if (validator) {
        return validator === this.numValidate ? '\\d' : '[a-zA-Z]';
      } else {
        if (escape.includes(char)) {
          return `\\${char}`;
        } else {
          return char;
        }
      }
    }).join('');

    /** Provide the regular expression */
    this.regExp = regExp;

    input.pattern = regExp;
    input.placeholder = input.placeholder || this.placeholder;

    input.addEventListener('keydown', this.__inputKeydownMask.bind(this));
    input.addEventListener('paste', this.__inputPaste.bind(this));
    input.addEventListener('focus', this.__inputFocus.bind(this));
    input.addEventListener('blur', this.__inputBlur.bind(this));
  }

  /**
   * Take some raw data and return the masked version
   * @param {string} data - The raw string to parse into the proper format
   * @return { false | string } - If valid, return the parsed string, otherwise false
   */
  parseRaw(data: any) {
    data = data || '';
    const filteredData = data.replace(/\W/g, '');

    if (filteredData.length === this.validators.length) {
      const isValid = filteredData.split('')
        .map((char: any, index: any) => !!char.match(this.validators[index].validator))
        .reduce((accumulator: any, currentValue: any) => {
          if (currentValue === false) {
            return false;
          } else {
            return accumulator;
          }
        });

      if (!isValid) {
        return false;
      }
      let pointer = -1;

      return this.mask.map((maskObj: any) => {
        if (maskObj.validator) {
          pointer += 1;
          return filteredData[pointer];
        } else {
          return maskObj.char;
        }
      }).join('');
    }
  }

  /**
   * Remove event listeners
   */
  disconnect() {
    this.input.addEventListener('keydown', this.__inputKeydownMask.bind(this));
    this.input.addEventListener('paste', this.__inputPaste.bind(this));
    this.input.addEventListener('focus', this.__inputFocus.bind(this));
    this.input.addEventListener('blur', this.__inputBlur.bind(this));
  }

  /** Simple masked value getter */
  get value() {
    return this.parseRaw(this.input.value);
  }

  /**
   * Parse an incomplete stringa and splice in placeholders
   * @param {string} data - A partial string to mask
   * @return {string} - A masked string with the additional placeholders
   */
  parsePartial(data = '') {
    data = data || '';
    const filteredData = data.replace(/\W/g, '');
    let pointer = -1;

    return this.mask.map((maskObj: any) => {
      if (maskObj.validator) {
        pointer += 1;
        return filteredData[pointer] || this.proxyChar;
      } else {
        return maskObj.char || this.proxyChar;
      }
    }).join('') || this.placeholder;
  }

  /**
   * Splice characters into a base string and return the result
   * @param {string} string - The base string
   * @param {number} index - The index at which to splice
   * @param {string} chars - The characters to splice into the base string
   * @return { string } - A newly-spliced string
   */
  splice(string: string, index: number, chars: string) {
    return string.slice(0, index) + chars + string.slice(index + 1);
  }

  /**
   * On input blur, remove the element's value
   * if it matches the placeholder
   * @param {Event} event - A blur event
   */
  __inputBlur(event: any) {
    if (event.target.value === this.placeholder) {
      this.onChange('');
    }
  }

  /**
   * On input focus, set the value to the placeholder
   * for the mask and set the selection at 0.
   * @param {Event} event - A focus event
   */
  __inputFocus(event: any) {
    const value = event.target.value;

    if (!value) {
      this.onChange(this.placeholder);
    }
  }

  /**
   * On input keydown, set manage the input's value
   * @param {Event} event - A keydown event
   */
  __inputKeydownMask(event: any) {
    const { selectionStart, selectionEnd } = event.target;
    const key = event.key;
    let index = selectionStart > this.mask.length - 1 ? this.mask.length - 1 : selectionStart;
    let mask = this.mask[index];

    /** Set up which keys to ignore */
    const ignored = ['Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Shift'];

    if (ignored.includes(key) || event.metaKey) {
      return;
    }

    /** If the value isn't a replacement of multiple characters */
    if (selectionStart === selectionEnd) {
      event.preventDefault();
      let _removingKey = null;

      if (key === 'Backspace') _removingKey = 1;
      else if (key === 'Delete') _removingKey = 0;

      if (_removingKey !== null) {

        /** If this is a delete event, replace the deleted element with the placeholder */
        const previous = this.mask[selectionStart - _removingKey];

        if (previous) {
          const replacement = previous.validator ? this.proxyChar : previous.char;

          this.onChange(this.splice(event.target.value, selectionStart - _removingKey, replacement));
          event.target.setSelectionRange(selectionStart - _removingKey, selectionStart - _removingKey);
        }

        return;
      }

      /** While the input doesn't have a validator, splice character in */
      while (mask && !mask.validator && key !== mask.char) {
        this.onChange(this.splice(event.target.value, index, mask.char));
        event.target.setSelectionRange(index + 1, index + 1);
        mask = this.mask[index + 1];
        index += 1;
      }

      /** If we have a validator for the key */
      if (mask && mask.validator) {
        const match = !!key.match(mask.validator);
        /** Don't allow non-matches */

        if (!match) {
          event.preventDefault();
          return false;
        }
      }

      /** Splice in the added data */
      this.onChange(this.splice(event.target.value, index, key));
      setTimeout(target => target.setSelectionRange(index + 1, index + 1), 0, event.target);

    } else {
      /** If this input replaces multiple items, check its validity and format if possible */
      setTimeout(() => {
        let partialValue = event.target.value;
        const newKey = key === 'Backspace' || key === 'Delete' ? this.proxyChar : key;
        const selectionPosition = key === 'Backspace' || key === 'Delete' ? selectionStart : selectionStart + 1;

        for (let i = selectionStart; i < selectionEnd; i++) {
          if (partialValue[i] !== ':') {
            partialValue = `${partialValue.substring(0, i)}${i === selectionStart ? newKey : this.proxyChar}${partialValue.substring(i + 1, partialValue.length)}`;
          }
        }

        this.onChange(partialValue);
        this.input.setSelectionRange(selectionPosition, selectionPosition);
      });
    }
  }

  /**
   * On input paste, validate the new data
   * @param {Event} event - Paste event
   */
  __inputPaste(event: any) {
    const data = event.clipboardData.getData('text/plain');
    const maskedData = this.parseRaw(data);

    if (maskedData !== false) {
      // this.setCustomValidity('');
      setTimeout(() => {
        this.onChange(maskedData);
      });
    }
  }
}
