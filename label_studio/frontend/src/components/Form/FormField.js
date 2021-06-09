import { forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FormContext } from "./FormContext";
import * as Validators from './Validation/Validators';

export const FormField = forwardRef(({
  label,
  name,
  children,
  required,
  validate,
  skip,
  setValue,
  dependency,
  ...props
}, ref) => {
  /**@type {Form} */
  const context = useContext(FormContext);
  const [dependencyField, setDependencyField] = useState(null);

  const field = ref ?? useRef();

  const validation = [
    ...(validate ?? []),
  ];

  if (required) validation.push(Validators.required);

  useEffect(() => {
    if (!context || !dependency) return;

    let field = null;
    const dep = context.getFieldContext(dependency);

    const handler = () => {
      props.onDependencyChanged?.(dep.field);
    };

    if (dep) {
      dep.field.addEventListener('change', handler);
      field = dep.field;
    } else {
      console.warn(`Dependency field not found ${dependency}`);
    }

    setDependencyField(field);
    return () => dep.field.removeEventListener('change', handler);
  }, [context, field, dependency]);

  const setValueCallback = useCallback((value) => {
    if (!field || !field.current) return;

    /**@type {HTMLInputElement|HTMLTextAreaElement} */
    const input = field.current;

    if (setValue instanceof Function) {
      setValue(value);
    } else if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = value ?? input.checked;
    } else {
      input.value = value;
    }

    const evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", false, true);
    input.dispatchEvent(evt);
  }, [field]);

  useEffect(() => {
    context?.registerField({
      label,
      name,
      validation,
      skip,
      field: field.current,
      setValue: setValueCallback,
    });
    return () => context?.unregisterField(name);
  }, [field, setValueCallback]);

  return children(field, dependencyField, context);
});
