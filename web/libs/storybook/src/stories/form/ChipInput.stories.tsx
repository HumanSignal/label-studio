import type { Meta, StoryObj } from "@storybook/react";
import { ChipInput } from "../../components/form/ChipInput/ChipInput";
import { within, userEvent } from "@storybook/testing-library";
import z from "zod";

const meta: Meta<typeof ChipInput> = {
  component: ChipInput,
  tags: ["autodocs"],
  argTypes: {
    onChange: {
      control: false,
    },
    value: {
      control: false,
    },
    format: {
      control: {
        type: "select",
      },
    },
    validate: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChipInput>;

export const Default: Story = {
  argTypes: meta.argTypes,
};

export const CustomPlaceholder: Story = {
  argTypes: meta.argTypes,
  args: {
    placeholder: "This is an arbitrary placeholder",
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByTestId("chip-input-field"), "hello@world.com another@email.com ", {
      delay: 50,
    });
  },
};

export const WithDefaultValue: Story = {
  argTypes: meta.argTypes,
  args: {
    format: "email",
    value: ["any@google.com", "another@email.com"],
  },
};

export const CustomValidation: Story = {
  argTypes: meta.argTypes,
  args: {
    validate: z.string().min(3),
    value: ["one", "two"],
  },
};
