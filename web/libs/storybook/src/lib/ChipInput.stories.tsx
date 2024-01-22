import { Meta, StoryObj } from '@storybook/react';
import { ChipInput } from '../components/ChipInput';

const meta: Meta<typeof ChipInput> = {
  component: ChipInput,
  argTypes: {
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
  render() {
    return <ChipInput />;
  },
};

export const WithPlaceholder: Story = {
  args: {
    placeholder: 'This is an arbitrary placeholder',
  },
};

export const WithDefaultValue: Story = {
  args: {
    format: 'email',
    value: ['nikita@humansignal.com'],
  },
  argTypes: {
    format: { control: { type: 'select' } },
  },
};
