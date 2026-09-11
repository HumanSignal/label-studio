import type React from "react";
import { Label, Toggle, Select } from "@humansignal/ui";
import Counter from "apps/labelstudio/src/components/Form/Elements/Counter/Counter";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";
import type { FieldDefinition } from "../types/common";
import { isFieldRequired } from "../types/provider";

interface FieldRendererProps {
  field: FieldDefinition;
  value: any;
  onChange: (name: string, value: any) => void;
  onBlur?: (name: string, value: any) => void;
  error?: string;
  isEditMode?: boolean;
  formData?: Record<string, any>; // Add formData to check dependencies
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  isEditMode = false,
  formData = {},
}) => {
  // Check if field should be disabled based on dependencies
  const isDisabledByDependency = () => {
    if (!field.dependsOn || !formData) {
      return false;
    }

    const dependencyValue = formData[field.dependsOn.field];
    const dependsOnValue = field.dependsOn.value;

    // If dependsOn.value is a function, call it with the dependency value and form data
    if (typeof dependsOnValue === "function") {
      const shouldEnable = dependsOnValue(dependencyValue, formData);
      return !shouldEnable;
    }

    // Otherwise, do a simple equality check
    return dependencyValue !== dependsOnValue;
  };

  // Check if field should be disabled (either read-only or by dependency)
  const isFieldDisabled = () => {
    return field.readOnly || isDisabledByDependency();
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Don't allow changes if field is disabled
    if (isFieldDisabled()) {
      return;
    }
    const { name, value: inputValue, type } = e.target;
    const parsedValue = type === "number" ? Number(inputValue) : inputValue;
    onChange(name, parsedValue);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onBlur) {
      const { name, value: inputValue, type } = e.target;
      const parsedValue = type === "number" ? Number(inputValue) : inputValue;
      onBlur(name, parsedValue);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    // Don't allow changes if field is disabled
    if (isFieldDisabled()) {
      return;
    }
    onChange(field.name, checked);
  };

  const handleSelectChange = (value: string) => {
    // Don't allow changes if field is disabled
    if (isFieldDisabled()) {
      return;
    }
    onChange(field.name, value);
  };

  const handleCounterChange = (e: any) => {
    // Don't allow changes if field is disabled
    if (isFieldDisabled()) {
      return;
    }
    onChange(field.name, Number(e.target.value));
  };

  // Common props for Input component
  const getInputProps = () => ({
    validate: "",
    skip: false,
    labelProps: {},
    ghost: false,
    tooltip: "",
    tooltipIcon: null,
    required: isFieldRequired(field, isEditMode, formData),
    label: field.label,
    description: field.description || "",
    footer: error ? <div className="text-negative-content">{error}</div> : "",
    className: error ? "border-negative-content" : "",
    placeholder: field.placeholder,
    autoComplete: field.autoComplete,
    readOnly: field.readOnly || false,
    disabled: isFieldDisabled(),
  });

  // Enhanced description for access key fields in edit mode
  const getEnhancedDescription = () => {
    return field.description || "";
  };

  switch (field.type) {
    case "hidden":
      return <input type="hidden" name={field.name} value={value || ""} onChange={handleInputChange} />;
    case "text":
    case "password":
      return (
        <Input
          name={field.name}
          type={field.type}
          value={value || ""}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          {...getInputProps()}
          description={getEnhancedDescription()}
        />
      );
    case "number":
      return (
        <Input
          name={field.name}
          type="number"
          value={value !== undefined && value !== null ? value : ""}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={field.min}
          max={field.max}
          step={field.step}
          {...getInputProps()}
        />
      );
    case "textarea":
      return (
        <Input
          name={field.name}
          value={value || ""}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          {...getInputProps()}
          description={getEnhancedDescription()}
        />
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label text={field.label} description={field.description} />
          <Select
            name={field.name}
            value={value ?? ""}
            onChange={(selectedValue) => handleSelectChange(selectedValue)}
            options={field.options || []}
            placeholder={field.placeholder}
            disabled={isFieldDisabled()}
          />
          {error && <p className="text-sm text-negative-content">{error}</p>}
        </div>
      );
    case "toggle": {
      const isDisabled = isFieldDisabled();
      return (
        <div className="flex items-start space-x-4">
          <Toggle
            checked={value || false}
            onChange={(e) => handleToggleChange(e.target.checked)}
            aria-label={field.label}
            label={field.label}
            description={field.description}
            disabled={isDisabled}
          />
        </div>
      );
    }
    case "counter": {
      const counterValue = value !== undefined && value !== null ? value : field.min || 0;
      const isDisabled = isFieldDisabled();
      return (
        <Counter
          name={field.name}
          label={field.label}
          value={counterValue}
          min={field.min || 0}
          max={field.max || 100}
          step={field.step || 1}
          onChange={handleCounterChange}
          className=""
          validate=""
          required={isFieldRequired(field, isEditMode, formData)}
          skip={false}
          labelProps={{}}
          disabled={isDisabled}
          key={`${field.name}-${isDisabled}`} // Force re-render when disabled state changes
        />
      );
    }

    default:
      return <div className="text-red-500">Unknown field type: {field.type}</div>;
  }
};
