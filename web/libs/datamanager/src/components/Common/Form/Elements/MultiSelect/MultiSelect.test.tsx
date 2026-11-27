/**
 * Tests for the DM Form.Builder ``multiselect`` field type and ``visible_when``
 * conditional visibility used by the Data Manager action dialogs (e.g. the
 * payments "Mark Ready for Payment" dialog).
 *
 * These exercise the LSO datamanager Form.Builder (``Form.jsx``), which is
 * the form library that actually renders DM action dialogs — separate from
 * the LSE labelstudio Form.Builder.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import Form from "../../Form";

const userOptions = [
  { value: "1", label: "Alice Example" },
  { value: "2", label: "Bob Example" },
];

describe("DM Form.Builder — multiselect element", () => {
  it("renders a native <select multiple> with the given options", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [
              {
                type: "multiselect",
                name: "user_ids",
                label: "Users",
                options: userOptions,
                testId: "users-multiselect",
              },
            ],
          },
        ]}
      />,
    );

    const select = screen.getByTestId("users-multiselect") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.multiple).toBe(true);
    const labels = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toContain("Alice Example");
    expect(labels).toContain("Bob Example");
  });

  it("filters options by label when searchable=true", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [
              {
                type: "multiselect",
                name: "user_ids",
                label: "Users",
                options: userOptions,
                searchable: true,
                testId: "users-multiselect",
              },
            ],
          },
        ]}
      />,
    );

    const filter = screen.getByTestId("users-multiselect-filter") as HTMLInputElement;
    fireEvent.change(filter, { target: { value: "bob" } });

    const select = screen.getByTestId("users-multiselect") as HTMLSelectElement;
    const labels = Array.from(select.querySelectorAll("option")).map((o) => o.textContent ?? "");
    expect(labels.some((t) => /bob/i.test(t))).toBe(true);
    expect(labels.some((t) => /alice/i.test(t))).toBe(false);
  });

  it("assembleFormData returns an array of selected option values", () => {
    const formRef = createRef<any>();
    render(
      <Form.Builder
        ref={formRef}
        fields={[
          {
            columnCount: 1,
            fields: [
              {
                type: "multiselect",
                name: "user_ids",
                label: "Users",
                options: userOptions,
                allowEmpty: true,
                testId: "users-multiselect",
              },
            ],
          },
        ]}
      />,
    );

    const select = screen.getByTestId("users-multiselect") as HTMLSelectElement;
    const opts = Array.from(select.querySelectorAll("option")) as HTMLOptionElement[];
    // Select "Bob" only
    opts[1].selected = true;
    fireEvent.change(select);

    // Reach the underlying Form (defaultProps via Form.Builder.ref?) — Form.Builder
    // forwards its ref to the inner Form component which exposes assembleFormData.
    const data = formRef.current?.assembleFormData?.({ asJSON: true });
    expect(data).toBeDefined();
    expect(Array.isArray(data.user_ids)).toBe(true);
    expect(data.user_ids).toEqual(["2"]);
  });
});

describe("DM Form.Builder — visible_when conditional visibility", () => {
  const selectionModeField = {
    type: "input",
    name: "selection_mode",
    label: "User selection",
  };

  const usersMultiselect = {
    type: "multiselect",
    name: "user_ids",
    label: "Users",
    options: userOptions,
    testId: "users-multiselect",
    visible_when: { field: "selection_mode", values: ["include", "exclude"] },
  };

  it("hides the field when the controlling field has no value", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [selectionModeField, usersMultiselect],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("users-multiselect")).not.toBeInTheDocument();
  });

  it("shows the field when defaultFormData provides a matching value", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [selectionModeField, usersMultiselect],
          },
        ]}
        formData={{ selection_mode: "include" }}
      />,
    );

    expect(screen.getByTestId("users-multiselect")).toBeInTheDocument();
  });

  it("shows the field when the controlling field has a default value", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [{ ...selectionModeField, value: "include" }, usersMultiselect],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("users-multiselect")).toBeInTheDocument();
  });

  it("reacts to user input on the controlling field", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [selectionModeField, usersMultiselect],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("users-multiselect")).not.toBeInTheDocument();

    const modeInput = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(modeInput, { target: { value: "exclude" } });

    expect(screen.getByTestId("users-multiselect")).toBeInTheDocument();
  });

  it("reacts to a toggle controlling field", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [
              { type: "toggle", name: "advanced_settings", label: "Advanced Settings" },
              {
                type: "input",
                name: "value_type",
                "data-testid": "advanced-value-type",
                visible_when: { field: "advanced_settings", values: "true" },
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("advanced-value-type")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByTestId("advanced-value-type")).toBeInTheDocument();
  });

  it("hides the field again when the controlling value moves out of the allowed set", () => {
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [selectionModeField, usersMultiselect],
          },
        ]}
        formData={{ selection_mode: "include" }}
      />,
    );

    expect(screen.getByTestId("users-multiselect")).toBeInTheDocument();

    const modeInput = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(modeInput, { target: { value: "all" } });

    expect(screen.queryByTestId("users-multiselect")).not.toBeInTheDocument();
  });

  it("unregisters hidden fields so stale selected users are not submitted", () => {
    const formRef = createRef<any>();
    render(
      <Form.Builder
        ref={formRef}
        fields={[
          {
            columnCount: 1,
            fields: [selectionModeField, usersMultiselect],
          },
        ]}
        formData={{ selection_mode: "include" }}
      />,
    );

    const select = screen.getByTestId("users-multiselect") as HTMLSelectElement;
    const opts = Array.from(select.querySelectorAll("option")) as HTMLOptionElement[];
    opts[1].selected = true;
    fireEvent.change(select);

    const modeInput = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(modeInput, { target: { value: "all" } });

    expect(screen.queryByTestId("users-multiselect")).not.toBeInTheDocument();
    expect(formRef.current?.assembleFormData?.({ asJSON: true })).not.toHaveProperty("user_ids");
  });

  it("preserves trigger_form_update while tracking visibility changes", async () => {
    const triggerAction = mock();
    render(
      <Form.Builder
        fields={[
          {
            columnCount: 1,
            fields: [{ ...selectionModeField, trigger_form_update: true }, usersMultiselect],
          },
        ]}
        triggerAction={triggerAction}
      />,
    );

    const modeInput = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(modeInput, { target: { value: "exclude" } });

    await waitFor(() => expect(triggerAction).toHaveBeenCalled());
    expect(screen.getByTestId("users-multiselect")).toBeInTheDocument();
  });
});
