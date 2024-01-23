import { Meta, StoryObj } from '@storybook/react';
import { ChipInput } from '../../components/ChipInput';
import { within, userEvent } from '@storybook/testing-library';

const meta: Meta<typeof ChipInput> = {
  component: ChipInput,
  tags: ['autodocs'],
  argTypes: {
    onChange: {
      disable: true,
    },
    value: {
      control: false,
    },
    format: {
      control: {
        type: 'select',
      },
    },
    validate: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChipInput>;

export const Primary: Story = {
  argTypes: meta.argTypes,
  render() {
    return <ChipInput />;
  },
};

export const WithPlaceholder: Story = {
  argTypes: meta.argTypes,
  args: {
    placeholder: 'This is an arbitrary placeholder',
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByTestId('chip-input-field'),
      'hello@world.com another@email.com ',
      {
        delay: 200,
      }
    );
  },
};

export const WithDefaultValue: Story = {
  args: {
    format: 'email',
    value: ['any@google.com', 'another@email.com'],
  },
  argTypes: meta.argTypes,
};
