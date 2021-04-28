import React, { useContext } from 'react';
import { shallowEqualObjects } from 'shallow-equal';
import { ApiProvider } from '../../providers/ApiProvider';
import { MultiProvider } from '../../providers/MultiProvider';
import { Block, cn, Elem } from '../../utils/bem';
import { debounce } from '../../utils/debounce';
import { objectClean } from '../../utils/helpers';
import { Oneof } from '../Oneof/Oneof';
import { Space } from '../Space/Space';
import { Counter, Input, Select, Toggle } from './Elements';
import './Form.styl';
import { FormContext, FormResponseContext, FormStateContext, FormSubmissionContext, FormValidationContext } from './FormContext';
import * as Validators from './Validation/Validators';

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
      this.fillFormData();
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
      <FormContext.Provider key="form-ctx" value={this}/>,
      <FormValidationContext.Provider key="form-validation-ctx" value={this.state.validation}/>,
      <FormSubmissionContext.Provider key="form-submission-ctx" value={this.state.submitting}/>,
      <FormStateContext.Provider key="form-state-ctx" value={this.state.state}/>,
      <FormResponseContext.Provider key="form-response" value={this.state.lastResponse}/>,
      <ApiProvider key="form-api" ref={this.apiRef}/>,
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
        >
          {this.props.children}

          {this.state.validation && this.state.showValidation && (
            <ValidationRenderer validation={this.state.validation}/>
          )}
        </form>
      </MultiProvider>
    );
  }

  registerField(field) {
    const existingField = this.getFieldContext(field.name);
    if (!existingField) {
      this.fields.add(field);
      this.fillFormData();
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
      this.setState({step: "submitting"});
      this.submit();
    } else {
      this.setState({step: "invalid"});
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

  assembleFormData({asJSON = false, full = false, booleansAsNumbers = false} = {}) {
    const requestBody = Array
      .from(this.fields)
      .reduce((res, { name, field, skip }) => {
        const skipField = (skip || (this.props.skipEmpty && !field.value));

        if (full === true || !skipField) {
          const value = (() => {
            const inputValue = field.value;

            if (['checkbox', 'radio'].includes(field.type)) {
              if (inputValue !== null &&  inputValue !== 'on') {
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
      return requestBody.reduce((res, [key, value]) => ({...res, [key]: value}), {});
    } else {
      const formData = new FormData();
      requestBody.forEach(([key, value]) => formData.append(key, value));
      return formData;
    }
  }

  async submit() {
    this.setState({ submitting: true, lastResponse: null });

    const rawAction = this.formElement.current.getAttribute("action");
    const useApi = this.api.isValidMethod(rawAction);
    const data = this.assembleFormData({ asJSON: useApi });
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
        this.setState({state: null});
      }, 1500);
    });
  }

  async submitWithAPI(action, body) {
    const urlParams = objectClean(this.props.params ?? {});
    const response = await this.api.callApi(action, {
      params: urlParams,
      body,
    });

    this.setState({lastResponse: response});

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
      this.setState({lastResponse: result});

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

    for(const field of this.fields) {
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
    const {validation, field: element} = field;
    const value = element.value?.trim() || null;

    validation.forEach((validator) => {
      const result = validator(field.label, value);
      if (result) messages.push(result);
    });

    return messages;
  }

  fillFormData() {
    if (!this.props.formData) return;
    if (this.fields.size === 0) return;

    Object.entries(this.props.formData).forEach(([key, value]) => {
      const field = this.getFieldContext(key);

      if (field && field.value !== value) {
        field.setValue(value);
      }
    });
  }
}

const ValidationRenderer = ({validation}) => {
  const rootClass = cn('form-validation');

  return <div className={rootClass}>
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
  </div>;
};

Form.Validator = Validators;

Form.Row = ({columnCount, rowGap, children, style}) => {
  const styles = {};

  if (columnCount) styles['--column-count'] = columnCount;
  if (rowGap) styles['--row-gap'] = rowGap;

  return (
    <div className={cn('form').elem('row')} style={{...(style ?? {}), ...styles}}>
      {children}
    </div>
  );
};

Form.Builder = React.forwardRef(({fields, children, formData, ...props}, ref) => {
  const renderFields = (fields) => {

    return fields.map((field, index) => {
      if (!field) return <div key={`spacer-${index}`}/>;

      const defaultValue = formData?.[field.name] || undefined;

      if (field.type === 'select') {
        return <Select key={field.name ?? index} {...field} value={field.value ?? defaultValue}/>;
      } else if (field.type === 'counter') {
        return <Counter key={field.name ?? index} {...field} value={field.value ?? defaultValue}/>;
      } else if (field.type === 'toggle') {
        return <Toggle key={field.name ?? index} {...field} checked={field.value ?? defaultValue}/>;
      } else {
        return <Input key={field.name ?? index} {...field} defaultValue={field.value ?? defaultValue}/>;
      }
    });
  };

  const renderColumns = (columns) => {
    return columns.map((col, index) => (
      <div className={cn('form').elem('column')} key={index} style={{width: col.width}}>
        {renderFields(col.fields)}
      </div>
    ));
  };

  return (
    <Form {...props} ref={ref}>
      {fields.map(({columnCount, fields, columns}, index) => (
        <Form.Row key={index} columnCount={columnCount}>
          {columns ? renderColumns(columns) : renderFields(fields)}
        </Form.Row>
      ))}
      {children}
    </Form>
  );
});

Form.Actions = ({children, valid, extra, size}) => {
  const rootClass = cn('form');
  return (
    <div className={rootClass.elem('submit').mod({size})}>
      <div className={rootClass.elem('info').mod({valid})}>
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
        <Elem tag="span" mod={{type: state}} name="item" case="success">Saved!</Elem>
      </Oneof>
    </Block>
  );
};

Form.ResponseParser = ({children}) => {
  const callback = children;

  if (callback instanceof Function === false) {
    throw new Error("Response Parser only accepts function as a child");
  }

  const response = useContext(FormResponseContext);

  return <>{response ? callback(response) : null}</>;
};
