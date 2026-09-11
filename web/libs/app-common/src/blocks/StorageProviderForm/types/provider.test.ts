import { z } from "zod";
import type { FieldDefinition } from "./common";
import { assembleSchema, coalesceSelectFieldValue, isFieldVisible, omitHiddenProviderFields } from "./provider";

function secretField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    name: "client_secret",
    type: "password",
    label: "Client Secret",
    required: true,
    schema: z.string(),
    visibleWhen: { field: "auth_mode", value: "service_principal" },
    ...overrides,
  };
}

function authModeField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    name: "auth_mode",
    type: "select",
    label: "Authentication Method",
    required: true,
    defaultValue: "service_principal",
    options: [
      { value: "service_principal", label: "Service Principal" },
      { value: "workload_identity", label: "Workload identity" },
    ],
    schema: z.string(),
    ...overrides,
  };
}

describe("assembleSchema superRefine", () => {
  const schema = assembleSchema([authModeField(), secretField()]);

  it("fails when a visible required field is empty", () => {
    const result = schema.safeParse({ auth_mode: "service_principal", client_secret: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "client_secret")).toBe(true);
    }
  });

  it("passes when the required field is hidden by visibleWhen", () => {
    const result = schema.safeParse({ auth_mode: "workload_identity", client_secret: "" });

    expect(result.success).toBe(true);
  });

  it("requires a visible field when requiredWhen matches", () => {
    const clientId: FieldDefinition = {
      name: "client_id",
      type: "text",
      label: "Client ID",
      schema: z.string().optional(),
      requiredWhen: { field: "auth_mode", value: "service_principal" },
      visibleWhen: { field: "auth_mode", value: ["service_principal", "workload_identity"] },
    };
    const requiredWhenSchema = assembleSchema([authModeField(), clientId]);
    const missing = requiredWhenSchema.safeParse({ auth_mode: "service_principal", client_id: "" });
    const optional = requiredWhenSchema.safeParse({ auth_mode: "workload_identity", client_id: "" });

    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.path[0] === "client_id")).toBe(true);
    }
    expect(optional.success).toBe(true);
  });
});

describe("omitHiddenProviderFields", () => {
  const fields: FieldDefinition[] = [
    authModeField(),
    {
      name: "tenant_id",
      type: "text",
      label: "Tenant ID",
      required: true,
      schema: z.string(),
      visibleWhen: { field: "auth_mode", value: "service_principal" },
    },
    secretField(),
    {
      name: "client_id",
      type: "text",
      label: "Client ID",
      schema: z.string().optional(),
      visibleWhen: { field: "auth_mode", value: ["service_principal", "workload_identity"] },
    },
  ];

  it("drops tenant_id and client_secret in workload identity mode", () => {
    const cleaned = omitHiddenProviderFields(
      {
        auth_mode: "workload_identity",
        tenant_id: "tenant",
        client_secret: "secret",
        client_id: "client",
      },
      fields,
    );

    expect(cleaned).toEqual({
      auth_mode: "workload_identity",
      client_id: "client",
    });
    expect(cleaned).not.toHaveProperty("tenant_id");
    expect(cleaned).not.toHaveProperty("client_secret");
  });
});

describe("coalesceSelectFieldValue", () => {
  it("maps null and omitted values to the select defaultValue", () => {
    const field = authModeField();

    expect(coalesceSelectFieldValue(field, null)).toBe("service_principal");
    expect(coalesceSelectFieldValue(field, undefined)).toBe("service_principal");
    expect(coalesceSelectFieldValue(field, "workload_identity")).toBe("workload_identity");
  });

  it("keeps tenant_id visible after coalescing a null auth_mode", () => {
    const tenantId: FieldDefinition = {
      name: "tenant_id",
      type: "text",
      label: "Tenant ID",
      required: true,
      schema: z.string(),
      visibleWhen: { field: "auth_mode", value: "service_principal" },
    };

    expect(isFieldVisible(tenantId, { auth_mode: null })).toBe(false);
    expect(isFieldVisible(tenantId, { auth_mode: coalesceSelectFieldValue(authModeField(), null) })).toBe(true);
  });
});
