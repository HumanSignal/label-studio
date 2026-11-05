import type { Meta, StoryObj } from "@storybook/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const meta: Meta<typeof Accordion> = {
  component: Accordion,
  title: "UI/Accordion",
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible>
      <AccordionItem value="general">
        <AccordionTrigger>General</AccordionTrigger>
        <AccordionContent>Project name, description and workspace.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="annotation">
        <AccordionTrigger>Annotation</AccordionTrigger>
        <AccordionContent>Sampling, overlap and skip behaviour.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="review">
        <AccordionTrigger>Review</AccordionTrigger>
        <AccordionContent>Who reviews and what happens on rejection.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={["general", "review"]}>
      <AccordionItem value="general">
        <AccordionTrigger>General</AccordionTrigger>
        <AccordionContent>Project name, description and workspace.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="review">
        <AccordionTrigger>Review</AccordionTrigger>
        <AccordionContent>Who reviews and what happens on rejection.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
