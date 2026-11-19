import type { Meta, StoryObj } from "@storybook/react";
import { Toast, type ToastProps, ToastType, ToastProvider, ToastViewport } from "./toast";

const ToastStory = (props: ToastProps) => {
  return (
    <ToastProvider type={ToastType.info}>
      <Toast {...props} open={true} />
      <div className="h-[140px] w-full flex items-center justify-center">
        <ToastViewport />
      </div>
    </ToastProvider>
  );
};

const meta: Meta<typeof Toast> = {
  title: "Feedback/Toast",
  component: ToastStory,
  argTypes: {
    type: {
      control: {
        type: "select",
        options: ["info", "error", "warning"],
      },
    },
    children: {
      control: "text",
    },
    duration: {
      control: "number",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Toast>;

export const Info: Story = {
  args: {
    type: ToastType.info,
    children: "This is an informational message.",
    duration: 3000,
  },
};

export const Error: Story = {
  args: {
    type: ToastType.error,
    children: "Something went wrong.",
    duration: 3000,
  },
};

export const AlertError: Story = {
  args: {
    type: ToastType.alertError,
    children: "This is an alertError toast.",
    duration: 3000,
  },
};
