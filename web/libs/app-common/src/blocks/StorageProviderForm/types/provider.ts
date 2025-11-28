import { z } from "zod";
import type { FieldDefinition, MessageDefinition, ProviderConfig } from "./common";

// Re-export ProviderConfig for convenience
export type { ProviderConfig };

// Shared function to determine if a field is actually required
export function isFieldRequired(field: FieldDefinition, isEditMode = false): boolean {
  // Access key fields are never required in edit mode (they can be provided via env vars)
  if (field.accessKey && isEditMode) {
    return false;
  }

  // Check if the field is explicitly marked as required
  if (field.required === true) {
    return true;
  }

  // Check if the schema indicates the field is required
  // A schema is considered required if it doesn't have .optional() or .default()
  const schemaAny = field.schema as any;

  // Check if the schema has .optional() modifier
  if (schemaAny._def?.typeName === "ZodOptional") {
    return false;
  }

  // Check if the schema has .default() modifier
  if (schemaAny._def?.typeName === "ZodDefault") {
    return false;
  }

  // Check if the inner type of a default schema is optional
  if (schemaAny._def?.innerType?._def?.typeName === "ZodOptional") {
    return false;
  }

  // For string fields, check if they have min(1) validation (indicating required)
  if (field.schema instanceof z.ZodString) {
    const stringSchema = field.schema as z.ZodString;
    // Check if the schema has min(1) validation
    if (stringSchema._def?.checks?.some((check: any) => check.kind === "min" && check.value === 1)) {
      return true;
    }
  }

  // Default to not required
  return false;
}

// Helper function to assemble the complete schema from field definitions
export function assembleSchema(fields: FieldDefinition[], isEditMode = false): z.ZodObject<any> {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema = field.schema;
    const isRequired = isFieldRequired(field, isEditMode);

    // For access keys in edit mode, make them optional and skip validation
    if (field.accessKey && isEditMode) {
      fieldSchema = fieldSchema.optional();
    } else if (isRequired) {
      // For required fields, ensure they have proper validation
      if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      } else if (fieldSchema instanceof z.ZodNumber) {
        // For numbers, we might want to add additional validation if needed
        // For now, just ensure it's not optional
        fieldSchema = fieldSchema.refine((val) => val !== undefined && val !== null, {
          message: `${field.label} is required`,
        });
      } else if (fieldSchema instanceof z.ZodBoolean) {
        // For booleans, ensure they're not optional
        fieldSchema = fieldSchema.refine((val) => val !== undefined && val !== null, {
          message: `${field.label} is required`,
        });
      } else {
        // For other types, ensure they're not optional
        fieldSchema = fieldSchema.refine((val) => val !== undefined && val !== null, {
          message: `${field.label} is required`,
        });
      }
    } else {
      // For optional fields, make them nullable to handle null values from server
      if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.nullable().optional();
      } else if (fieldSchema instanceof z.ZodNumber) {
        fieldSchema = fieldSchema.nullable().optional();
      } else if (fieldSchema instanceof z.ZodBoolean) {
        fieldSchema = fieldSchema.nullable().optional();
      } else {
        fieldSchema = fieldSchema.nullable().optional();
      }
    }

    schemaObject[field.name] = fieldSchema;
  });

  return z.object(schemaObject);
}

// Helper function to extract default values from Zod schemas
export function extractDefaultValues(fields: (FieldDefinition | MessageDefinition)[]): Record<string, any> {
  const defaultValues: Record<string, any> = {};

  fields.forEach((field) => {
    if (field.type === "message") return;

    // Check if the field has a default value
    if (Object.prototype.hasOwnProperty.call(field, "defaultValue") && field.defaultValue !== undefined) {
      const customDefault = typeof field.defaultValue === "function" ? field.defaultValue() : field.defaultValue;
      defaultValues[field.name] = customDefault;
      return;
    }

    // If the field does not have a default value, try to get it from the schema
    try {
      // Try to get the default value from the schema by accessing the internal structure
      const schemaAny = field.schema as any;
      let defaultValue = undefined;

      // Check different possible locations for default values in Zod schemas
      if (schemaAny._def?.defaultValue !== undefined) {
        defaultValue =
          typeof schemaAny._def.defaultValue === "function"
            ? schemaAny._def.defaultValue()
            : schemaAny._def.defaultValue;
      } else if (schemaAny._def?.innerType?._def?.defaultValue !== undefined) {
        defaultValue =
          typeof schemaAny._def.innerType._def.defaultValue === "function"
            ? schemaAny._def.innerType._def.defaultValue()
            : schemaAny._def.innerType._def.defaultValue;
      } else if (schemaAny._def?.typeName === "ZodDefault") {
        defaultValue =
          typeof schemaAny._def.innerType._def.defaultValue === "function"
            ? schemaAny._def.innerType._def.defaultValue()
            : schemaAny._def.innerType._def.defaultValue;
      }

      if (defaultValue !== undefined) {
        defaultValues[field.name] = defaultValue;
      } else {
        // Set appropriate defaults based on field type
        switch (field.type) {
          case "text":
          case "password":
          case "textarea":
            defaultValues[field.name] = "";
            break;
          case "number":
          case "counter":
            defaultValues[field.name] = field.min || 0;
            break;
          case "select":
            defaultValues[field.name] = field.options?.[0]?.value || "";
            break;
          case "toggle":
            defaultValues[field.name] = false;
            break;
        }
      }
    } catch (error) {
      // If we can't extract the default, use type-based defaults
      switch (field.type) {
        case "text":
        case "password":
        case "textarea":
          defaultValues[field.name] = "";
          break;
        case "number":
        case "counter":
          defaultValues[field.name] = field.min || 0;
          break;
        case "select":
          defaultValues[field.name] = field.options?.[0]?.value || "";
          break;
        case "toggle":
          defaultValues[field.name] = false;
          break;
      }
    }
  });

  return defaultValues;
}

// Helper function to get field by name
export function getFieldByName(
  fields: (FieldDefinition | MessageDefinition)[],
  name: string,
): FieldDefinition | MessageDefinition | undefined {
  return fields.find((field) => field.name === name);
}

// Helper function to get fields for a specific row
export function getFieldsForRow(
  fields: (FieldDefinition | MessageDefinition)[],
  rowFields: string[],
  target?: "import" | "export",
): (FieldDefinition | MessageDefinition)[] {
  const filteredFields = rowFields.map((fieldName) => getFieldByName(fields, fieldName)).filter(Boolean) as (
    | FieldDefinition
    | MessageDefinition
  )[];

  // Filter fields based on target if specified
  if (target) {
    return filteredFields.filter((field) => {
      if (field.type === "message") return true; // Always show messages
      return !field.target || field.target === target;
    });
  }

  return filteredFields;
}
