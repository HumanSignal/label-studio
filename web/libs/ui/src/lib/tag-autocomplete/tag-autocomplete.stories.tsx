import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TagAutocomplete } from "./tag-autocomplete";

const meta: Meta<typeof TagAutocomplete> = {
  component: TagAutocomplete,
  title: "UI/TagAutocomplete",
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    disabled: {
      control: "boolean",
    },
    isLoading: {
      control: "boolean",
    },
    maxTags: {
      control: "number",
    },
    maxVisibleTags: {
      control: "number",
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
A tag-like autocomplete component that allows users to select multiple tags from a predefined list.

## Features
- **Typeahead search** - Filter options by typing
- **Keyboard navigation** - Full keyboard support for selecting and removing tags
- **Tag overflow** - Shows "+N more" badge when tags exceed the visible limit
- **Loading state** - Displays a spinner while fetching options
- **Form integration** - Works with standard HTML forms

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Arrow Left/Right | Navigate between tags |
| Arrow Up/Down | Navigate dropdown options |
| Enter | Select highlighted option |
| Backspace/Delete | Remove focused tag |
| Escape | Close dropdown |
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TagAutocomplete>;

const sampleTags = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "devops", label: "DevOps" },
  { value: "design", label: "Design" },
  { value: "qa", label: "QA" },
  { value: "mobile", label: "Mobile" },
  { value: "data-science", label: "Data Science" },
  { value: "machine-learning", label: "Machine Learning" },
  { value: "security", label: "Security" },
  { value: "cloud", label: "Cloud" },
];

const simpleTags = ["React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "Remix", "Astro"];

/**
 * Default TagAutocomplete
 *
 * Basic usage with a list of options.
 */
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Select tags..."
        />
        <p className="mt-4 text-sm text-neutral-content-subtle">
          Selected: {value.length > 0 ? value.join(", ") : "None"}
        </p>
      </div>
    );
  },
};

/**
 * With Simple String Options
 *
 * Options can be simple strings instead of objects.
 */
export const SimpleStrings: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["React", "Next.js"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={simpleTags}
          value={value}
          onChange={setValue}
          placeholder="Select frameworks..."
        />
      </div>
    );
  },
};

/**
 * With Label and Description
 *
 * Form field with label and helper text.
 */
export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagAutocomplete
          label="Project Tags"
          description="Select up to 5 tags that describe your project"
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Add tags..."
          maxTags={5}
          required
        />
      </div>
    );
  },
};

/**
 * Pre-selected Values
 *
 * Component initialized with pre-selected tags.
 */
export const PreSelected: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend", "backend", "devops"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Select tags..."
        />
      </div>
    );
  },
};

/**
 * Tag Overflow with +N More
 *
 * When tags exceed maxVisibleTags, shows a "+N more" badge.
 */
export const TagOverflow: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([
      "frontend",
      "backend",
      "devops",
      "design",
      "qa",
      "mobile",
    ]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Select tags..."
          maxVisibleTags={3}
        />
        <p className="mt-2 text-sm text-neutral-content-subtle">
          maxVisibleTags is set to 3, showing "+{Math.max(0, value.length - 3)} more"
        </p>
      </div>
    );
  },
};

/**
 * Limited Selection (maxTags)
 *
 * Limit the number of tags that can be selected.
 */
export const LimitedSelection: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          label="Skills"
          description="Select up to 3 skills"
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Select skills..."
          maxTags={3}
        />
        <p className="mt-2 text-sm text-neutral-content-subtle">
          {value.length}/3 selected
        </p>
      </div>
    );
  },
};

/**
 * Loading State
 *
 * Shows a spinner while options are being loaded.
 */
export const LoadingState: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Loading tags..."
          isLoading={true}
        />
        <p className="mt-2 text-sm text-neutral-content-subtle">
          The spinner replaces the caret icon when loading
        </p>
      </div>
    );
  },
};

/**
 * Async Search Simulation
 *
 * Simulates loading options from an API based on search query.
 */
export const AsyncSearch: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    const [options, setOptions] = useState(sampleTags);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = (query: string) => {
      setIsLoading(true);
      // Simulate API delay
      setTimeout(() => {
        const filtered = sampleTags.filter((tag) =>
          tag.label.toLowerCase().includes(query.toLowerCase()),
        );
        setOptions(filtered);
        setIsLoading(false);
      }, 500);
    };

    return (
      <div className="w-96">
        <TagAutocomplete
          label="Search Tags"
          description="Type to search (simulated 500ms delay)"
          options={options}
          value={value}
          onChange={setValue}
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Type to search..."
        />
      </div>
    );
  },
};

/**
 * Disabled State
 *
 * Component in disabled state.
 */
export const Disabled: Story = {
  render: () => {
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={["frontend", "backend"]}
          onChange={() => {}}
          placeholder="Select tags..."
          disabled
        />
      </div>
    );
  },
};

/**
 * Size Variants
 *
 * Available size options: small, medium (default), large.
 */
export const SizeVariants: Story = {
  render: () => {
    const [value1, setValue1] = useState<string[]>(["frontend"]);
    const [value2, setValue2] = useState<string[]>(["frontend", "backend"]);
    const [value3, setValue3] = useState<string[]>(["frontend"]);

    return (
      <div className="flex flex-col gap-6 w-96">
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Small:</p>
          <TagAutocomplete
            options={sampleTags}
            value={value1}
            onChange={setValue1}
            size="small"
            placeholder="Small..."
          />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Medium (default):</p>
          <TagAutocomplete
            options={sampleTags}
            value={value2}
            onChange={setValue2}
            size="medium"
            placeholder="Medium..."
          />
        </div>
        <div>
          <p className="text-sm text-neutral-content-subtle mb-2">Large:</p>
          <TagAutocomplete
            options={sampleTags}
            value={value3}
            onChange={setValue3}
            size="large"
            placeholder="Large..."
          />
        </div>
      </div>
    );
  },
};

/**
 * Empty State
 *
 * Component with no pre-selected values.
 */
export const EmptyState: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Click or type to add tags..."
        />
      </div>
    );
  },
};

/**
 * With Disabled Options
 *
 * Some options can be disabled.
 */
export const DisabledOptions: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);
    const optionsWithDisabled = [
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "devops", label: "DevOps", disabled: true },
      { value: "design", label: "Design" },
      { value: "qa", label: "QA", disabled: true },
      { value: "mobile", label: "Mobile" },
    ];

    return (
      <div className="w-96">
        <TagAutocomplete
          options={optionsWithDisabled}
          value={value}
          onChange={setValue}
          placeholder="Select tags..."
        />
        <p className="mt-2 text-sm text-neutral-content-subtle">
          DevOps and QA options are disabled
        </p>
      </div>
    );
  },
};

/**
 * In a Form Context
 *
 * Example of TagAutocomplete used in a form.
 */
export const InFormContext: Story = {
  render: () => {
    const [skills, setSkills] = useState<string[]>(["frontend"]);
    const [interests, setInterests] = useState<string[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(`Skills: ${skills.join(", ")}\nInterests: ${interests.join(", ")}`);
    };

    return (
      <form onSubmit={handleSubmit} className="w-96 space-y-6">
        <TagAutocomplete
          name="skills"
          label="Skills"
          description="Select your technical skills"
          options={sampleTags}
          value={skills}
          onChange={setSkills}
          placeholder="Add skills..."
          required
        />

        <TagAutocomplete
          name="interests"
          label="Interests"
          description="What areas interest you?"
          options={[
            { value: "ai", label: "Artificial Intelligence" },
            { value: "web3", label: "Web3 / Blockchain" },
            { value: "iot", label: "Internet of Things" },
            { value: "ar-vr", label: "AR / VR" },
            { value: "robotics", label: "Robotics" },
          ]}
          value={interests}
          onChange={setInterests}
          placeholder="Add interests..."
        />

        <button
          type="submit"
          className="px-4 py-2 bg-primary-emphasis text-white rounded hover:bg-primary-emphasis-bold"
        >
          Submit
        </button>
      </form>
    );
  },
};

/**
 * Keyboard Navigation Demo
 *
 * Demonstrates keyboard navigation features.
 */
export const KeyboardNavigation: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend", "backend", "devops"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue}
          placeholder="Try keyboard navigation..."
        />
        <div className="mt-4 p-4 bg-neutral-surface rounded text-sm">
          <p className="font-medium mb-2">Try these keyboard shortcuts:</p>
          <ul className="space-y-1 text-neutral-content-subtle">
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">←</kbd> / <kbd className="px-1 bg-neutral-surface-bold rounded">→</kbd> Navigate between tags</li>
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">↑</kbd> / <kbd className="px-1 bg-neutral-surface-bold rounded">↓</kbd> Navigate dropdown options</li>
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">Enter</kbd> Select highlighted option</li>
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">Backspace</kbd> Remove tag or focus last tag</li>
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">Delete</kbd> Remove focused tag</li>
            <li>• <kbd className="px-1 bg-neutral-surface-bold rounded">Esc</kbd> Close dropdown</li>
          </ul>
        </div>
      </div>
    );
  },
};

/**
 * Long Labels
 *
 * Tags with long labels are truncated.
 */
export const LongLabels: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["long-1", "long-2"]);
    const longOptions = [
      { value: "long-1", label: "This is a very long tag label that should be truncated" },
      { value: "long-2", label: "Another extremely long label for demonstration" },
      { value: "long-3", label: "Short" },
      { value: "long-4", label: "Medium length label" },
    ];

    return (
      <div className="w-96">
        <TagAutocomplete
          options={longOptions}
          value={value}
          onChange={setValue}
          placeholder="Select tags..."
        />
      </div>
    );
  },
};

/**
 * Many Options
 *
 * Component with a large list of options.
 */
export const ManyOptions: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    const manyOptions = Array.from({ length: 50 }, (_, i) => ({
      value: `option-${i + 1}`,
      label: `Option ${i + 1}`,
    }));

    return (
      <div className="w-96">
        <TagAutocomplete
          options={manyOptions}
          value={value}
          onChange={setValue}
          placeholder="Search 50 options..."
        />
        <p className="mt-2 text-sm text-neutral-content-subtle">
          50 options available - use search to filter
        </p>
      </div>
    );
  },
};

/**
 * Custom Filter
 *
 * Using a custom search filter function.
 */
export const CustomFilter: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);

    // Custom filter that matches start of string only
    const startsWithFilter = (option: any, query: string) => {
      const label = option.label || option;
      return label.toLowerCase().startsWith(query.toLowerCase());
    };

    return (
      <div className="w-96">
        <TagAutocomplete
          label="Custom Filter"
          description="Only matches options that START with your query"
          options={sampleTags}
          value={value}
          onChange={setValue}
          searchFilter={startsWithFilter}
          placeholder="Type 'f' to find Frontend..."
        />
      </div>
    );
  },
};
