import { render, screen } from "@testing-library/react";
import { ProviderForm } from "./provider-form";
import type { FieldDefinition } from "../types/common";
import { coalesceSelectFieldValue, type ProviderConfig } from "../types/provider";
import { z } from "zod";

/**
 * Tests for ProviderForm component with visibleWhen conditional field rendering.
 *
 * These tests validate:
 * - Fields without visibleWhen are always rendered
 * - Fields with visibleWhen are conditionally rendered based on form data
 * - Array values in visibleWhen.value work correctly
 * - Function values in visibleWhen.value work correctly
 */

// Mock provider config for testing visibleWhen functionality
const createTestProvider = (): ProviderConfig => ({
  name: "test-provider",
  title: "Test Provider",
  description: "Test provider for conditional field rendering",
  fields: [
    {
      name: "auth_type",
      type: "select",
      label: "Authentication Type",
      required: true,
      defaultValue: "pat",
      options: [
        { value: "pat", label: "Personal Access Token" },
        { value: "sp", label: "Service Principal" },
        { value: "azure_sp", label: "Azure Service Principal" },
      ],
      schema: z.string(),
    },
    {
      name: "token",
      type: "password",
      label: "Access Token",
      schema: z.string().optional(),
      visibleWhen: { field: "auth_type", value: "pat" },
    },
    {
      name: "client_id",
      type: "text",
      label: "Client ID",
      schema: z.string().optional(),
      visibleWhen: { field: "auth_type", value: ["sp", "azure_sp"] },
    },
    {
      name: "tenant_id",
      type: "text",
      label: "Tenant ID",
      schema: z.string().optional(),
      visibleWhen: { field: "auth_type", value: "azure_sp" },
    },
    {
      name: "always_visible",
      type: "text",
      label: "Always Visible Field",
      schema: z.string().optional(),
      // No visibleWhen - should always be rendered
    },
  ],
  layout: [
    { fields: ["auth_type"] },
    { fields: ["token"] },
    { fields: ["client_id"] },
    { fields: ["tenant_id"] },
    { fields: ["always_visible"] },
  ],
});

describe("ProviderForm visibleWhen", () => {
  const defaultProps = {
    provider: createTestProvider(),
    errors: {},
    onChange: mock(),
  };

  it("renders fields without visibleWhen condition", () => {
    render(<ProviderForm {...defaultProps} formData={{ auth_type: "pat" }} />);

    // auth_type selector should always be visible
    expect(screen.getByText("Authentication Type")).toBeInTheDocument();
    // Field without visibleWhen should be visible
    expect(screen.getByText("Always Visible Field")).toBeInTheDocument();
  });

  it("shows token field when auth_type is 'pat'", () => {
    render(<ProviderForm {...defaultProps} formData={{ auth_type: "pat" }} />);

    // token should be visible in PAT mode
    expect(screen.getByText("Access Token")).toBeInTheDocument();
    // client_id should NOT be visible in PAT mode
    expect(screen.queryByText("Client ID")).not.toBeInTheDocument();
    // tenant_id should NOT be visible in PAT mode
    expect(screen.queryByText("Tenant ID")).not.toBeInTheDocument();
  });

  it("shows client_id field when auth_type is 'sp'", () => {
    render(<ProviderForm {...defaultProps} formData={{ auth_type: "sp" }} />);

    // token should NOT be visible in SP mode
    expect(screen.queryByText("Access Token")).not.toBeInTheDocument();
    // client_id should be visible in SP mode (matches array value)
    expect(screen.getByText("Client ID")).toBeInTheDocument();
    // tenant_id should NOT be visible in SP mode (only azure_sp)
    expect(screen.queryByText("Tenant ID")).not.toBeInTheDocument();
  });

  it("shows both client_id and tenant_id when auth_type is 'azure_sp'", () => {
    render(<ProviderForm {...defaultProps} formData={{ auth_type: "azure_sp" }} />);

    // token should NOT be visible in Azure SP mode
    expect(screen.queryByText("Access Token")).not.toBeInTheDocument();
    // client_id should be visible (matches array value)
    expect(screen.getByText("Client ID")).toBeInTheDocument();
    // tenant_id should be visible (exact match)
    expect(screen.getByText("Tenant ID")).toBeInTheDocument();
  });

  it("hides fields when visibleWhen condition is not met", () => {
    render(<ProviderForm {...defaultProps} formData={{ auth_type: "sp" }} />);

    // token has visibleWhen: { field: "auth_type", value: "pat" }
    // Current auth_type is "sp", so token should be hidden
    expect(screen.queryByText("Access Token")).not.toBeInTheDocument();
  });

  it("handles empty form data gracefully", () => {
    render(<ProviderForm {...defaultProps} formData={{}} />);

    // Fields without visibleWhen should still render
    expect(screen.getByText("Authentication Type")).toBeInTheDocument();
    expect(screen.getByText("Always Visible Field")).toBeInTheDocument();
    // Fields with visibleWhen should not render (no matching value)
    expect(screen.queryByText("Access Token")).not.toBeInTheDocument();
    expect(screen.queryByText("Client ID")).not.toBeInTheDocument();
    expect(screen.queryByText("Tenant ID")).not.toBeInTheDocument();
  });
});

describe("ProviderForm visibleWhen with function values", () => {
  const createProviderWithFunctionCondition = (): ProviderConfig => ({
    name: "test-provider-func",
    title: "Test Provider",
    description: "Test provider with function-based visibleWhen",
    fields: [
      {
        name: "enable_advanced",
        type: "toggle",
        label: "Enable Advanced Options",
        schema: z.boolean().optional(),
      },
      {
        name: "advanced_option",
        type: "text",
        label: "Advanced Option",
        schema: z.string().optional(),
        visibleWhen: {
          field: "enable_advanced",
          value: (value: boolean) => value === true,
        },
      },
    ],
    layout: [{ fields: ["enable_advanced"] }, { fields: ["advanced_option"] }],
  });

  it("shows field when function condition returns true", () => {
    render(
      <ProviderForm
        provider={createProviderWithFunctionCondition()}
        formData={{ enable_advanced: true }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.getByText("Advanced Option")).toBeInTheDocument();
  });

  it("hides field when function condition returns false", () => {
    render(
      <ProviderForm
        provider={createProviderWithFunctionCondition()}
        formData={{ enable_advanced: false }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.queryByText("Advanced Option")).not.toBeInTheDocument();
  });
});

describe("ProviderForm message visibleWhen", () => {
  const createProviderWithMessages = (): ProviderConfig => ({
    name: "test-provider-messages",
    title: "Test Provider",
    description: "Test provider with conditional message banners",
    fields: [
      {
        name: "auth_mode",
        type: "select",
        label: "Authentication Method",
        required: true,
        defaultValue: "service_principal",
        options: [
          { value: "service_principal", label: "Service Principal (client secret)" },
          { value: "workload_identity", label: "Workload identity / managed identity (no secret)" },
        ],
        schema: z.string(),
      },
      {
        name: "info_sp",
        type: "message",
        content: <div>Service principal permissions docs</div>,
        visibleWhen: { field: "auth_mode", value: "service_principal" },
      },
      {
        name: "info_wi",
        type: "message",
        content: <div>Cluster identity and Blob RBAC</div>,
        visibleWhen: { field: "auth_mode", value: "workload_identity" },
      },
      {
        name: "info_always",
        type: "message",
        content: <div>Always visible banner</div>,
      },
    ],
    layout: [{ fields: ["auth_mode"] }, { fields: ["info_sp"] }, { fields: ["info_wi"] }, { fields: ["info_always"] }],
  });

  it("shows the matching message and hides the other when visibleWhen is set", () => {
    render(
      <ProviderForm
        provider={createProviderWithMessages()}
        formData={{ auth_mode: "service_principal" }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.getByText("Service principal permissions docs")).toBeInTheDocument();
    expect(screen.queryByText("Cluster identity and Blob RBAC")).not.toBeInTheDocument();
    expect(screen.getByText("Always visible banner")).toBeInTheDocument();
  });

  it("swaps message banners when the dependency value changes", () => {
    render(
      <ProviderForm
        provider={createProviderWithMessages()}
        formData={{ auth_mode: "workload_identity" }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.queryByText("Service principal permissions docs")).not.toBeInTheDocument();
    expect(screen.getByText("Cluster identity and Blob RBAC")).toBeInTheDocument();
    expect(screen.getByText("Always visible banner")).toBeInTheDocument();
  });
});

describe("ProviderForm legacy null auth_mode edit", () => {
  const createLegacySpiProvider = (): ProviderConfig => ({
    name: "azure_spi",
    title: "Azure SPI",
    description: "Legacy edit parity",
    fields: [
      {
        name: "auth_mode",
        type: "select",
        label: "Authentication Method",
        required: true,
        defaultValue: "service_principal",
        options: [
          { value: "service_principal", label: "Service Principal (client secret)" },
          { value: "workload_identity", label: "Workload identity / managed identity (no secret)" },
        ],
        schema: z.string(),
      },
      {
        name: "tenant_id",
        type: "text",
        label: "Tenant ID",
        required: true,
        schema: z.string(),
        visibleWhen: { field: "auth_mode", value: "service_principal" },
      },
      {
        name: "client_id",
        type: "text",
        label: "Client ID",
        schema: z.string().optional(),
      },
    ],
    layout: [{ fields: ["auth_mode"] }, { fields: ["tenant_id"] }, { fields: ["client_id"] }],
  });

  it("hides Tenant ID when auth_mode is still null", () => {
    render(
      <ProviderForm
        provider={createLegacySpiProvider()}
        formData={{ auth_mode: null, tenant_id: "tenant", client_id: "client" }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.queryByText("Tenant ID")).not.toBeInTheDocument();
    expect(screen.getByText("Client ID")).toBeInTheDocument();
  });

  it("shows Tenant ID after coalescing null auth_mode to the select default", () => {
    const provider = createLegacySpiProvider();
    const authMode = provider.fields.find((field) => field.name === "auth_mode") as FieldDefinition;
    const coalescedAuthMode = coalesceSelectFieldValue(authMode, null);

    render(
      <ProviderForm
        provider={provider}
        formData={{ auth_mode: coalescedAuthMode, tenant_id: "tenant", client_id: "client" }}
        errors={{}}
        onChange={mock()}
      />,
    );

    expect(screen.getByText("Tenant ID")).toBeInTheDocument();
    expect(screen.getByText("Client ID")).toBeInTheDocument();
  });
});
