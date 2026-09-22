import type React from "react";
import { FieldRenderer } from "./field-renderer";
import { type ProviderConfig, getFieldsForRow, isFieldVisible } from "../types/provider";
import type { FieldDefinition, MessageDefinition } from "../types/common";
import type { FC } from "react";

interface ProviderFormProps {
  provider: ProviderConfig;
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (name: string, value: any) => void;
  onBlur?: (name: string, value: any) => void;
  isEditMode?: boolean;
  target?: "import" | "export";
}

export const ProviderForm: React.FC<ProviderFormProps> = ({
  provider,
  formData,
  errors,
  onChange,
  onBlur,
  isEditMode = false,
  target,
}) => {
  const getHiddenFields = (field: FieldDefinition | MessageDefinition) =>
    field.type === "hidden" && (!target || !field.target || field.target === target);

  return (
    <div className="space-y-6">
      {/* Render hidden fields first, outside of layout */}
      {provider.fields.filter(getHiddenFields).map((field) => (
        <FieldRenderer
          key={field.name}
          field={field as FieldDefinition}
          value={formData[field.name]}
          onChange={onChange}
          onBlur={onBlur}
          error={errors[field.name]}
          isEditMode={isEditMode}
          formData={formData}
        />
      ))}

      {/* Render visible fields in layout */}
      {provider.layout.map((row, rowIndex) => {
        const fields = getFieldsForRow(provider.fields, row.fields, target);
        // Filter fields based on visibility conditions
        const visibleFields = fields.filter((field) => isFieldVisible(field, formData));

        return (
          visibleFields.length > 0 && (
            <div
              key={rowIndex}
              className="grid gap-6"
              style={{
                // Use visible fields count for grid columns to avoid empty spaces
                gridTemplateColumns: `repeat(${visibleFields.length}, 1fr)`,
              }}
            >
              {visibleFields.map((field) => {
                // Skip hidden fields from layout - they'll be rendered separately
                if (field.type === "hidden") {
                  return null;
                }
                const Message =
                  field.type === "message"
                    ? field.content instanceof Function
                      ? field.content
                      : ((() => field.content) as FC)
                    : null;

                return (
                  <div
                    key={field.name}
                    style={{
                      gridColumn: field.gridCols ?? "initial",
                    }}
                  >
                    {Message ? (
                      <div>
                        <Message />
                      </div>
                    ) : (
                      <FieldRenderer
                        field={field as FieldDefinition}
                        value={formData[field.name]}
                        onChange={onChange}
                        onBlur={onBlur}
                        error={errors[field.name]}
                        isEditMode={isEditMode}
                        formData={formData}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )
        );
      })}
    </div>
  );
};
