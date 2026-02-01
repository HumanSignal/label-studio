import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TagAutocomplete } from "./tag-autocomplete";
import type { TagOption } from "./types";
import { Typography } from "../typography/typography";
import { Button } from "../button/button";

const meta: Meta<typeof TagAutocomplete> = {
  component: TagAutocomplete,
  title: "UI/TagAutocomplete",
  argTypes: {
    disabled: {
      control: "boolean",
    },
    isLoading: {
      control: "boolean",
    },
    minSearchLength: {
      control: "number",
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
A tag-like autocomplete component that allows users to select multiple tags from a predefined list.

## Features
- **Typeahead search** - Filter options by typing (minimum 2 characters by default)
- **Keyboard navigation** - Full keyboard support for selecting and removing tags
- **Multiline tags** - Tags automatically wrap to multiple lines when needed
- **Highlighted search** - Search text is highlighted in matching options
- **Tag creation** - Allow users to create new tags on the fly (with allowCreate prop)
- **Loading state** - Displays a spinner in the dropdown while fetching options
- **Form integration** - Works with standard HTML forms via name prop

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Arrow Left/Right | Navigate between tags |
| Arrow Up/Down | Navigate dropdown options |
| Enter / Comma | Select highlighted option or create new tag |
| Backspace/Delete | Remove focused tag |
| Escape | Close dropdown |
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TagAutocomplete>;

const sampleTags: TagOption<string>[] = [
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
 * Basic usage with a list of options. Users need to type at least 2 characters to see the dropdown.
 */
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-full">
        <TagAutocomplete
          triggerClassName="w-96"
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          placeholder="Type at least 2 characters to search..."
        />
        <div className="mt-base">
          <Typography variant="body" size="small" className="text-neutral-content-subtle">
            <strong>Available:</strong> {sampleTags.map((tag) => tag.label).join(", ")}
          </Typography>
          <Typography variant="body" size="small" className="text-neutral-content-subtle">
            <strong>Selected:</strong> {value.length > 0 ? value.join(", ") : "None"}
          </Typography>
        </div>
        <div className="mt-base p-base bg-neutral-surface rounded text-sm w-[400px]">
          <Typography variant="body" size="small" className="mb-tight">
            <strong>Keyboard shortcuts:</strong>
          </Typography>
          <ul className="space-y-tight text-neutral-content-subtle">
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">←</kbd> /{" "}
              <kbd className="px-tight bg-neutral-surface-bold rounded">→</kbd> Navigate between tags
            </li>
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">↑</kbd> /{" "}
              <kbd className="px-tight bg-neutral-surface-bold rounded">↓</kbd> Navigate dropdown options
            </li>
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">Enter</kbd> /{" "}
              <kbd className="px-tight bg-neutral-surface-bold rounded">,</kbd> Select highlighted option or create new
              tag
            </li>
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">Backspace</kbd> Remove tag or focus last tag
            </li>
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">Delete</kbd> Remove focused tag
            </li>
            <li>
              • <kbd className="px-tight bg-neutral-surface-bold rounded">Esc</kbd> Close dropdown
            </li>
          </ul>
        </div>
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
          onChange={setValue as any}
          placeholder="Select frameworks..."
        />
      </div>
    );
  },
};

/**
 * Multiple Tags - Multiline Wrapping
 *
 * When many tags are selected, they automatically wrap to multiple lines.
 */
export const MultipleTagsWrapping: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([
      "frontend",
      "backend",
      "devops",
      "design",
      "qa",
      "mobile",
      "data-science",
      "machine-learning",
    ]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          placeholder="Type to search..."
        />
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          All {value.length} tags are shown and wrap to multiple lines
        </Typography>
      </div>
    );
  },
};

/**
 * Form Validation Pattern
 *
 * Shows how to integrate with form validation. The component is purely controlled -
 * all validation (max tags, required, etc.) is handled by the parent using libraries
 * like Zod, Yup, or React Hook Form.
 */
export const FormValidationPattern: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);
    const [error, setError] = useState<string>("");
    const [touched, setTouched] = useState(false);
    const [submittedTags, setSubmittedTags] = useState<string[]>([]);

    // Validation logic (could be Zod, Yup, etc.)
    const validate = (values: string[]) => {
      if (values.length === 0) return "At least one tag is required";
      if (values.length > 3) return "Maximum 3 tags allowed";
      return "";
    };

    const handleChange = (newValues: string[]) => {
      setValue(newValues);
      setTouched(true);
      const validationError = validate(newValues);
      setError(validationError);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        setTouched(true);
        return;
      }
      setSubmittedTags(value);
    };

    return (
      <form onSubmit={handleSubmit} className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={handleChange as any}
          placeholder="Select 1-3 skills..."
        />
        {touched && error && <div className="mt-tight text-xs text-danger-content">{error}</div>}
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          {value.length}/3 selected
        </Typography>
        <Button type="submit" variant="primary" className="mt-base">
          Submit
        </Button>

        {submittedTags.length > 0 && (
          <div className="mt-base p-base bg-neutral-surface rounded">
            <Typography variant="body" size="small" className="font-medium mb-tight">
              Submitted Tags:
            </Typography>
            <Typography variant="body" size="small" className="text-neutral-content-subtle">
              {submittedTags.join(", ")}
            </Typography>
          </div>
        )}
      </form>
    );
  },
};

/**
 * Loading State
 *
 * Shows a spinner in the dropdown while options are being loaded.
 */
export const LoadingState: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          placeholder="Type to search..."
          isLoading={true}
          minSearchLength={1}
        />
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          Type to see the loading spinner in the dropdown
        </Typography>
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
          (tag.label ?? tag.value).toLowerCase().includes(query.toLowerCase()),
        );
        setOptions(filtered);
        setIsLoading(false);
      }, 500);
    };

    return (
      <div className="w-96">
        <TagAutocomplete
          options={options}
          value={value}
          onChange={setValue as any}
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Type to search (simulated 500ms delay)..."
        />
      </div>
    );
  },
};

/**
 * With Tag Creation
 *
 * Allow users to create new tags that don't exist in the list.
 */
export const WithTagCreation: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["frontend"]);

    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          allowCreate={true}
          placeholder="Type to search or create new tags..."
        />
        <Typography variant="body" size="small" className="mt-base text-neutral-content-subtle">
          Selected: {value.join(", ")}
        </Typography>
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
          onChange={setValue as any}
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
          onChange={setValue as any}
          placeholder="Select tags..."
        />
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          DevOps and QA options are disabled
        </Typography>
      </div>
    );
  },
};

/**
 * In a Form Context
 *
 * Example of TagAutocomplete with tag creation and submission.
 */
export const InFormContext: Story = {
  render: () => {
    const [skills, setSkills] = useState<string[]>([]);
    const [submittedTags, setSubmittedTags] = useState<string[]>([]);

    const handleSkillsChange = (values: string[]) => {
      setSkills(values);
    };

    const handleAdd = () => {
      // Validation checks
      if (skills.length === 0) return;

      // Distinguish between existing and new tags
      const existingSkills = skills.filter((skill) => sampleTags.some((tag) => tag.value === skill));
      const newSkills = skills.filter((skill) => !sampleTags.some((tag) => tag.value === skill));

      console.log("Existing skills:", existingSkills);
      console.log("New skills to create:", newSkills);
      console.log("All skills:", skills);

      setSubmittedTags(skills);
      setSkills([]);
    };

    return (
      <div className="w-full max-w-2xl space-y-wide">
        <div>
          <Typography variant="body" size="small" className="font-medium mb-tight">
            Skills
          </Typography>
          <form
            className="flex gap-tight items-start"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <div className="flex-1">
              <TagAutocomplete
                name="skills"
                options={sampleTags}
                value={skills}
                onChange={handleSkillsChange as any}
                allowCreate={true}
                placeholder="Type to add skills..."
              />
            </div>
            <Button type="submit" variant="primary" disabled={skills.length === 0}>
              Add
            </Button>
          </form>
        </div>

        <div className="mt-base">
          <Typography variant="body" size="small" className="text-neutral-content-subtle">
            Available: {sampleTags.map((tag) => tag.label).join(", ") || "All selected"}
          </Typography>
        </div>

        {submittedTags.length > 0 && (
          <div className="p-base bg-neutral-surface rounded">
            <Typography variant="body" size="small" className="font-medium mb-tight">
              Submitted Tags:
            </Typography>
            <Typography variant="body" size="small" className="text-neutral-content-subtle">
              {submittedTags.join(", ")}
            </Typography>
          </div>
        )}
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
        <TagAutocomplete options={longOptions} value={value} onChange={setValue as any} placeholder="Select tags..." />
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
          onChange={setValue as any}
          placeholder="Search 50 options..."
        />
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          50 options available - use search to filter
        </Typography>
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
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          searchFilter={startsWithFilter}
          placeholder="Custom filter: matches start only (type 'f' for Frontend)..."
        />
      </div>
    );
  },
};

/**
 * Custom Minimum Search Length
 *
 * Configure the minimum number of characters required before showing the dropdown.
 */
export const CustomMinSearchLength: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagAutocomplete
          options={sampleTags}
          value={value}
          onChange={setValue as any}
          minSearchLength={3}
          placeholder="Minimum 3 character to search..."
        />
        <Typography variant="body" size="small" className="mt-base text-neutral-content-subtle">
          <strong>Available:</strong> {sampleTags.map((tag) => tag.label).join(", ")}
        </Typography>
      </div>
    );
  },
};
