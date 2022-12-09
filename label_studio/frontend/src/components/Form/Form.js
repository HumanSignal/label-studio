import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { shallowEqualObjects } from 'shallow-equal';
import { ApiProvider } from '../../providers/ApiProvider';
import { MultiProvider } from '../../providers/MultiProvider';
import { Block, cn, Elem } from '../../utils/bem';
import { debounce } from '../../utils/debounce';
import { isDefined, objectClean } from '../../utils/helpers';
import { Button } from '../Button/Button';
import { Oneof } from '../Oneof/Oneof';
import { Space } from '../Space/Space';
import { Counter, Input, Select, Toggle } from './Elements';
import './Form.styl';
import { FormContext, FormResponseContext, FormStateContext, FormSubmissionContext, FormValidationContext } from './FormContext';
import * as Validators from './Validation/Validators';

const PASSWORD_PROTECTED_VALUE = 'got ya, suspicious hacker!';

export default class Form extends React.Component {
  state = {
    validation: null,
    showValidation: true,
    submitting: false,
  }

  /**@type {import('react').RefObject<HTMLFormElement>} */
  formElement = React.createRef()

  apiRef = React.createRef()

  /**@type {Set<HTMLInputElement|HTMLSelectElement>} */
  fields = new Set()

  validation = new Map()

  get api() { return this.apiRef.current; }

  componentDidMount() {
    if (this.props.formData) {
      setTimeout(() => {
        this.fillFormData();
      }, 50);
    }
  }

  componentDidUpdate(prevProps) {
    const equal = shallowEqualObjects(prevProps.formData ?? {}, this.props.formData ?? {});

    if (!equal) {
      this.fillFormData();
    }
  }

  render() {
    const providers = [
      <FormContext.Provider key="form-ctx" value={this} />,
      <FormValidationContext.Provider key="form-validation-ctx" value={this.state.validation} />,
      <FormSubmissionContext.Provider key="form-submission-ctx" value={this.state.submitting} />,
      <FormStateContext.Provider key="form-state-ctx" value={this.state.state} />,
      <FormResponseContext.Provider key="form-response" value={this.state.lastResponse} />,
      <ApiProvider key="form-api" ref={this.apiRef} />,
    ];

    return (
      <MultiProvider providers={providers}>
        <form
          ref={this.formElement}
          className={cn('form')}
          action={this.props.action}
          onSubmit={this.onFormSubmitted}
          onChange={this.onFormChanged}
          autoComplete={this.props.autoComplete}
          autoSave={this.props.autoSave}
          style={this.props.style}
        >
          {this.props.children}

          {this.state.validation && this.state.showValidation && (
            <ValidationRenderer validation={this.state.validation} />
          )}
        </form>
      </MultiProvider>
    );
  }

  registerField(field) {
    const existingField = this.getFieldContext(field.name);

    if (!existingField) {
      this.fields.add(field);

      setTimeout(() => {
        this.fillWithFormData(field);
      }, 0);
    } else {
      Object.assign(existingField, field);
    }
  }

  unregisterField(name) {
    const field = this.getFieldContext(name);

    if (field) this.fields.delete(field);
  }

  getField(name) {
    return this.getFieldContext(name)?.field;
  }

  getFieldContext(name) {
    return Array.from(this.fields).find(f => f.name === name);
  }

  disableValidationMessage() {
    this.setState({ showValidation: false });
  }

  enableValidationMessage() {
    this.setState({ showValidation: true });
  }

  onFormSubmitted = async (e) => {
    e.preventDefault();

    this.validateFields();

    if (!this.validation.size) {
      this.setState({ step: "submitting" });
      this.submit();
    } else {
      this.setState({ step: "invalid" });
    }
  }

  _onAutoSubmit = () => {
    this.validateFields();

    if (!this.validation.size) {
      this.submit();
    }
  }

  onAutoSubmit = this.props.debounce ? debounce(this._onAutoSubmit, this.props.debounce) : this._onAutoSubmit

  onFormChanged = async (e) => {
    e.stopPropagation();

    this.props.onChange?.(e);

    this.autosubmit();
  }

  autosubmit() {
    if (this.props.autosubmit) {
      setTimeout(() => {
        this.onAutoSubmit();
      }, 100);
    }
  }

  assembleFormData({
    asJSON = false,
    full = false,
    booleansAsNumbers = false,
    fieldsFilter,
  } = {}) {
    let fields = Array.from(this.fields);

    if (fieldsFilter instanceof Function) {
      fields = fields.filter(fieldsFilter);
    }


    const requestBody = fields.reduce((res, { name, field, skip, allowEmpty, isProtected }) => {
      const skipProtected = isProtected && field.value === PASSWORD_PROTECTED_VALUE;
      const skipField = skip || skipProtected || ((this.props.skipEmpty || allowEmpty === false) && !field.value);

      if (full === true || !skipField) {
        const value = (() => {
          const inputValue = field.value;

          if (['checkbox', 'radio'].includes(field.type)) {
            if (isDefined(inputValue) && !['', 'on', 'off', 'true', 'false'].includes(inputValue)) {
              return field.checked ? inputValue : null;
            }

            return booleansAsNumbers ? Number(field.checked) : field.checked;
          }

          return inputValue;
        })();

        if (value !== null) res.push([name, value]);
      }

      return res;
    }, []);

    if (asJSON) {
      return requestBody.reduce((res, [key, value]) => ({ ...res, [key]: value }), {});
    } else {
      const formData = new FormData();

      requestBody.forEach(([key, value]) => formData.append(key, value));
      return formData;
    }
  }

  async submit({ fieldsFilter } = {}) {
    this.setState({ submitting: true, lastResponse: null });

    const rawAction = this.formElement.current.getAttribute("action");
    const useApi = this.api.isValidMethod(rawAction);
    const data = this.assembleFormData({ asJSON: useApi, fieldsFilter });
    const body = this.props.prepareData?.(data) ?? data;
    let success = false;

    if (useApi) {
      success = await this.submitWithAPI(rawAction, body);
    } else {
      success = await this.submitWithFetch(body);
    }

    this.setState({
      submitting: false,
      state: success ? "success" : "fail",
    }, () => {
      setTimeout(() => {
        this.setState({ state: null });
      }, 1500);
    });
  }

  async submitWithAPI(action, body) {
    const urlParams = objectClean(this.props.params ?? {});
    const response = await this.api.callApi(action, {
      params: urlParams,
      body,
    });

    this.setState({ lastResponse: response });

    if (response === null) {
      this.props.onError?.();
      return false;
    } else {
      this.props.onSubmit?.(response);
      return true;
    }
  }

  async submitWithFetch(body) {
    const action = this.formElement.current.action;
    const method = (this.props.method ?? 'POST').toUpperCase();
    const response = await fetch(action, { method, body });

    try {
      const result = await response.json();

      this.setState({ lastResponse: result });

      if (result.validation_errors) {
        Object.entries(result.validation_errors).forEach(([key, messages]) => {
          const field = this.getField(key);

          this.validation.set(field.name, {
            label: field.label,
            field: field.field,
            messages,
          });
        });

        this.setState({ validation: this.validation });
      }

      if (response.ok) {
        this.props.onSubmit?.(result);
        return true;
      } else {
        this.props.onError?.(result);
      }
    } catch (err) {
      console.log(err);
      this.props.onError?.(err);
    }
    return false;
  }

  validateFields() {
    this.validation.clear();

    for (const field of this.fields) {
      const result = this.validateField(field);

      if (result.length) {
        this.validation.set(field.name, {
          label: field.label,
          messages: result,
          field: field.field,
        });
      }
    }

    if (this.validation.size) {
      this.setState({ validation: this.validation });
    } else {
      this.setState({ validation: null });
    }

    return this.validation.size === 0;
  }

  validateField(field) {
    const messages = [];
    const { validation, field: element } = field;
    const value = element.value?.trim() || null;

    if (field.isProtected && value === PASSWORD_PROTECTED_VALUE) {
      return messages;
    }

    validation.forEach((validator) => {
      const result = validator(field.label, value);

      if (result) messages.push(result);
    });

    return messages;
  }

  fillFormData() {
    if (!this.props.formData) return;
    if (this.fields.size === 0) return;

    Array.from(this.fields).forEach((field) => {
      this.fillWithFormData(field);
    });
  }

  fillWithFormData(field) {
    const value = (this.props.formData ?? {})[field.name];

    if (field.isProtected && this.props.formData) {
      field.setValue(PASSWORD_PROTECTED_VALUE);
    } else if (isDefined(value) && field.value !== value && !field.skipAutofill) {
      field.setValue(value);
    }
  }
}

const ValidationRenderer = ({ validation }) => {
  const rootClass = cn('form-validation');

  return (
    <div className={rootClass}>
      {Array.from(validation).map(([name, result]) => (
        <div key={name} className={rootClass.elem('group')} onClick={() => result.field.focus()}>
          <div className={rootClass.elem('field')}>{result.label}</div>

          <div className={rootClass.elem('messages')}>
            {result.messages.map((message, i) => (
              <div key={`${name}-${i}`} className={rootClass.elem('message')}>
                {message}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

Form.Validator = Validators;

Form.Row = ({ columnCount, rowGap, children, style, spread = false }) => {
  const styles = {};

  if (columnCount) styles['--column-count'] = columnCount;
  if (rowGap) styles['--row-gap'] = rowGap;

  return (
    <div className={cn('form').elem('row').mod({ spread })} style={{ ...(style ?? {}), ...styles }}>
      {children}
    </div>
  );
};

Form.Builder = React.forwardRef(({
  fields: defaultFields,
  formData: defaultFormData,
  fetchFields,
  fetchFormData,
  children,
  formRowStyle,
  onSubmit,
  withActions,
  ...props
}, ref) => {
  const formRef = ref ?? useRef();
  const [fields, setFields] = useState(defaultFields ?? []);
  const [formData, setFormData] = useState(defaultFormData ?? {});

  const renderFields = (fields) => {
    return fields.map((field, index) => {
      if (!field) return <div key={`spacer-${index}`} />;

      const currentValue = formData?.[field.name] ?? undefined;
      const triggerUpdate = props.autosubmit !== true && field.trigger_form_update === true;
      const getValue = () => {
        const isProtected = field.skipAutofill && (!field.allowEmpty || field.protectedValue) && field.type === 'password';

        if (isProtected) {
          return PASSWORD_PROTECTED_VALUE;
        }

        if (field.skipAutofill) {
          return null;
        }

        return currentValue ?? field.value;
      };

      const commonProps = {};

      if (triggerUpdate) {
        commonProps.onChange = async () => {
          await formRef.current.submit({
            fieldsFilter: (f) => f.name === field.name,
          });
          await updateFields();
          await updateFormData();
        };
      }

      const InputComponent = (() => {
        switch(field.type) {
          case "select": return Select;
          case "counter": return Counter;
          case "toggle": return Toggle;
          default: return Input;
        }
      })();

      if (['checkbox', 'radio', 'toggle'].includes(field.type)) {
        commonProps.checked = getValue();
      } else {
        commonProps.defaultValue = getValue();
      }

      return (
        <InputComponent
          key={field.name ?? index}
          {...field}
          {...commonProps}
        />
      );
    });
  };

  const renderColumns = (columns) => {
    return columns.map((col, index) => (
      <div className={cn('form').elem('column')} key={index} style={{ width: col.width }}>
        {renderFields(col.fields)}
      </div>
    ));
  };

  const updateFields = useCallback(async () => {
    if (fetchFields) {
      const newFields = await fetchFields();

      if (JSON.stringify(fields) !== JSON.stringify(newFields)) {
        setFields(newFields);
      }
    }
  }, [fetchFields]);

  const updateFormData = useCallback(async () => {
    if (fetchFormData) {
      const newFormData = await fetchFormData();

      if (shallowEqualObjects(formData, newFormData) === false) {
        setFormData(newFormData);
      }
    }
  }, [fetchFormData]);

  const handleOnSubmit = useCallback(async (...args) => {
    onSubmit?.(...args);
    await updateFields();
    await updateFormData();
  }, [onSubmit, fetchFormData]);

  useEffect(() => {
    updateFields();
  }, [updateFields]);

  useEffect(() => {
    updateFormData();
  }, [updateFormData]);

  useEffect(() => {
    setFields(defaultFields);
  }, [defaultFields]);

  return (
    <Form {...props} onSubmit={handleOnSubmit} ref={formRef}>
      {(fields ?? []).map(({ columnCount, fields, columns }, index) => (
        <Form.Row key={index} columnCount={columnCount} style={formRowStyle} spread>
          {columns ? renderColumns(columns) : renderFields(fields)}
        </Form.Row>
      ))}
      {children}
      {(props.autosubmit !== true && withActions === true) && (
        <Form.Actions>
          <Button
            type="submit"
            look="primary"
            style={{ width: 120 }}
          >
            Save
          </Button>
        </Form.Actions>
      )}
    </Form>
  );
});

Form.Actions = ({ children, valid, extra, size }) => {
  const rootClass = cn('form');

  return (
    <div className={rootClass.elem('submit').mod({ size })}>
      <div className={rootClass.elem('info').mod({ valid })}>
        {extra}
      </div>

      <Space>
        {children}
      </Space>
    </div>
  );
};

Form.Indicator = () => {
  const state = React.useContext(FormStateContext);

  return (
    <Block name="form-indicator">
      <Oneof value={state}>
        <Elem tag="span" mod={{ type: state }} name="item" case="success">Saved!</Elem>
      </Oneof>
    </Block>
  );
};

Form.ResponseParser = ({ children }) => {
  const callback = children;

  if (callback instanceof Function === false) {
    throw new Error("Response Parser only accepts function as a child");
  }

  const response = useContext(FormResponseContext);

  return <>{response ? callback(response) : null}</>;
};
