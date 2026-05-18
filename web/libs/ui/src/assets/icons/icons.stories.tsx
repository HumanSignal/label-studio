import type { Meta } from "@storybook/react";
import React, { useState } from "react";
import * as Icons from "./";

const iconCardClassName =
  "group inline-flex w-full flex-col items-center rounded-small border border-neutral-border bg-neutral-background p-4 text-left transition-all duration-200 " +
  "cursor-pointer hover:border-neutral-border-bold hover:bg-neutral-surface-hover hover:shadow-sm " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus-outline " +
  "active:scale-[0.99]";

/**
 * forwardRef/memo components are typeof "object". The catalog previously used
 * `typeof comp === "function"` only, which hid every Phosphor and SVGR icon in Storybook.
 */
const isRenderableIcon = (value: unknown): value is React.ElementType => {
  if (typeof value === "function") return true;
  if (typeof value !== "object" || value === null) return false;
  const t = (value as { $$typeof?: symbol }).$$typeof;
  return t === Symbol.for("react.forward_ref") || t === Symbol.for("react.memo");
};

/** Low-level Phosphor exports that are valid element types but not standalone icons for the grid. */
const PHOSPHOR_STORYBOOK_EXCLUSIONS = new Set(["IconBase"]);

// Function to get SVG file name from component name
const getFileNameFromIcon = (iconName: string): string => {
  // Regular icons
  if (iconName.startsWith("Icon")) {
    // Convert IconCamelCase to kebab-case.svg
    const name = iconName.substring(4); // Remove 'Icon' prefix

    if (name === "HumanSignal") {
      return "humansignal.svg";
    }

    return `${name
      .replace(/([A-Z])/g, "-$1")
      .replace(/^-/, "")
      .toLowerCase()}.svg`;
  }

  return "unknown.svg";
};

// Function to get the category of an icon
const getIconCategory = (iconName: string): string => {
  const name = iconName.substring(4); // Remove 'Icon' prefix

  if (["Models", "Model", "ModelVersion", "BoundingBox", "Predictions", "LsLabeling", "LsReview"].includes(name)) {
    return "AI/ML";
  }

  if (
    [
      "HumanSignal",
      "Slack",
      "Github",
      "Mastercard",
      "Visa",
      "OpenAI",
      "Anthropic",
      "Azure",
      "Gemini",
      "VertexAI",
    ].includes(name)
  ) {
    return "Brand";
  }

  if (
    [
      "Annotation",
      "AnnotationAccepted",
      "AnnotationRejected",
      "AnnotationSkipped",
      "AnnotationSkipped2",
      "AnnotationGroundTruth",
      "AnnotationImported",
      "AnnotationPrediction",
      "AnnotationPropagated",
      "AnnotationReviewRemoved",
      "AnnotationSubmitted",
      "Ban",
      "BanSquare",
      "DraftCreated",
      "DraftCreated2",
      "SparkSquare",
    ].includes(name)
  ) {
    return "Labeling Actions";
  }

  if (["ZoomIn", "ZoomOut", "BulkLabeling"].includes(name) || name.includes("Tool")) {
    return "Labeling Tools";
  }

  if (["RelationRight", "RelationLeft", "RelationBi", "RelationLink"].includes(name)) {
    return "Relations";
  }

  if (name.startsWith("Property")) {
    return "Properties";
  }

  if (
    ["ThumbsUp", "ThumbsDown", "ThumbsUpFill", "ThumbsDownFill", "ThumbsUpOutline", "ThumbsDownOutline"].includes(name)
  ) {
    return "Feedback";
  }

  if (name.includes("Comment") || ["Send"].includes(name)) {
    return "Comments";
  }

  if (
    name.includes("Check") ||
    name.includes("Cross") ||
    name.includes("Close") ||
    ["Remove", "Delete"].includes(name)
  ) {
    return "Check & Cross";
  }

  if (
    [
      "VolumeMute",
      "VolumeHalf",
      "VolumeFull",
      "SoundConfig",
      "SoundMutedConfig",
      "SoundMuted",
      "Play",
      "Pause",
      "Replay",
      "Rewind",
      "FastForward",
      "TimelinePlay",
      "TimelinePause",
      "TimelineRegion",
      "TimelineRewind",
      "TimelineFastForward",
      "TimelineRewind",
      "InterpolationAdd",
      "InterpolationRemove",
      "InterpolationDisabled",
      "KeypointAdd",
      "KeypointDelete",
      "KeypointDisabled",
      "Prev",
      "Next",
      "Fast",
      "Slow",
      "Speed",
    ].includes(name)
  ) {
    return "Audio & Video";
  }

  if (["Bouncing3Dots", "SoundBars"].includes(name)) {
    return "Animated";
  }

  if (["Star", "StarOutline", "StarSquare", "StarRectangle"].includes(name)) {
    return "Stars";
  }

  if (["AllProjects"].includes(name) || name.includes("Folder")) {
    return "Folders";
  }

  if (
    ["Document", "Text", "Pencil"].includes(name) ||
    name.includes("File") ||
    name.includes("Copy") ||
    name.includes("Undo") ||
    name.includes("Redo") ||
    name.includes("Upload") ||
    name.includes("Download") ||
    name.includes("Duplicate") ||
    name.includes("Paste") ||
    name.includes("Cut") ||
    name.includes("Delete") ||
    name.includes("Edit") ||
    name.includes("Trash") ||
    name.includes("Folder")
  ) {
    return "Content & Documents";
  }

  if (["Calendar"].includes(name) || name.includes("Date") || name.includes("Time") || name.includes("Clock")) {
    return "Calendar & Time";
  }

  if (["Forward", "Backward"].includes(name) || name.includes("Arrow") || name.includes("Chevron")) {
    return "Navigation";
  }

  if (
    ["Help", "QuestionOutline", "Warning", "WarningCircle", "WarningCircleFilled", "Error", "ErrorAlt"].includes(
      name,
    ) ||
    name.includes("Info")
  ) {
    return "Information";
  }

  // Default category
  return "Misc";
};

// Description for each category
const categoryDescriptions: Record<string, string> = {
  Misc: "Miscellaneous icons",
  Special: "Special case icons with unique names",
  "AI/ML": "Icons related to AI and ML",
  Brand: "Icons related to brands/companies",
  "Labeling Tools": "Icons related to tools used for interactions and editing",
  "Labeling Actions": "Icons related to actions performed during labeling",
  Comments: "Icons for comments and feedback",
  Relations: "Icons representing different types of relations",
  Properties: "Icons for properties and attributes",
  Feedback: "Icons representing user feedback (thumbs up/down, etc.)",
  "Check & Cross": "Icons for indicating success, completion, or rejection",
  "Audio & Video": "Icons related to audio and video controls and volume",
  Stars: "Star-related icons for ratings and favorites",
  Folders: "Icons for folders and project management",
  "Content & Documents": "Icons for files and content management",
  "Calendar & Time": "Icons for calendar and time",
  Navigation: "Icons for navigation and direction indicators",
  Information: "Icons for information, warnings, errors, and help",
  Animated: "Animated icons",
};

// Component for a single custom SVG icon
const IconItem = ({ name, Icon }: { name: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }) => {
  const fileName = getFileNameFromIcon(name);

  return (
    <button
      type="button"
      className={iconCardClassName}
      data-testid={`icon-card-${name}`}
      aria-label={`Copy ${name} to clipboard`}
      onClick={() => {
        void navigator.clipboard.writeText(name);
      }}
    >
      <div className="icon-preview mb-2 flex h-10 w-10 items-center justify-center text-neutral-content transition-transform duration-200 group-hover:scale-150">
        {React.createElement(Icon, { width: 24, height: 24 })}
      </div>
      <div className="icon-name mb-1 break-words text-center text-xs font-bold text-neutral-content-subtle">{name}</div>
      <div className="icon-file-name text-10 break-words text-center text-neutral-content-subtle">{fileName}</div>
      <span className="mt-2 text-center text-10 font-medium text-primary-content-subtle opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Click to copy
      </span>
    </button>
  );
};

// Component for a single Phosphor icon (uses size prop)
const PhosphorIconItem = ({
  name,
  IconComponent,
}: {
  name: string;
  IconComponent: React.ComponentType<{ size?: number }>;
}) => {
  const copyLabel = name;

  return (
    <button
      type="button"
      className={iconCardClassName}
      data-testid={`phosphor-icon-card-${name}`}
      aria-label={`Copy ${copyLabel} to clipboard`}
      onClick={() => {
        void navigator.clipboard.writeText(copyLabel);
      }}
    >
      <div className="icon-preview mb-2 flex h-10 w-10 items-center justify-center text-neutral-content transition-transform duration-200 group-hover:scale-150">
        {React.createElement(IconComponent, { size: 24 })}
      </div>
      <div className="icon-name mb-1 w-full break-words text-center text-xs font-bold text-neutral-content-subtle">
        {copyLabel}
      </div>
      <span className="mt-2 text-center text-10 font-medium text-primary-content-subtle opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Click to copy
      </span>
    </button>
  );
};

// Component to display all Phosphor icons
const PhosphorIconCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const phosphorEntries = Object.entries(Icons).filter(([name, comp]) => {
    // Only show canonical XxxIcon names; skip deprecated unsuffixed duplicates (e.g. ArrowRight)
    if (!name.endsWith("Icon")) return false;
    if (PHOSPHOR_STORYBOOK_EXCLUSIONS.has(name)) return false;
    if (!isRenderableIcon(comp)) return false;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="icon-catalog flex flex-col gap-4 p-8">
      <h2 className="mb-2 text-2xl font-bold">Phosphor Icons ({phosphorEntries.length})</h2>
      <p className="mb-1 text-sm text-neutral-content-subtle">
        Cards are interactive: hover shows a copy hint and emphasis; click to copy the export name.
      </p>
      <p className="mb-4 text-sm text-neutral-content-subtle">
        Usage:{" "}
        <code>{'import { FolderSimplePlusIcon } from "@humansignal/icons"; <FolderSimplePlusIcon size={24} />'}</code>
      </p>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search Phosphor icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded border border-neutral-border bg-neutral-background text-neutral-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus-outline w-full text-sm mb-4"
        />
      </div>
      <div className="icons-grid grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
        {phosphorEntries.map(([name, comp]) => (
          <PhosphorIconItem key={name} name={name} IconComponent={comp as React.ComponentType<{ size?: number }>} />
        ))}
      </div>
      {phosphorEntries.length === 0 && (
        <div className="text-center my-10 text-neutral-content-subtle">No icons found matching "{searchTerm}"</div>
      )}
    </div>
  );
};

// Create a component to display a grid of all icons
const IconCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Only custom SVG icons: start with "Icon" prefix, never end with "Icon" suffix (Phosphor convention)
  const iconEntries = Object.entries(Icons).filter(
    ([name, comp]) =>
      name.startsWith("Icon") &&
      !name.endsWith("Icon") &&
      !PHOSPHOR_STORYBOOK_EXCLUSIONS.has(name) &&
      isRenderableIcon(comp),
  );

  // Filter icons based on search term (component name or file name)
  const filteredIcons = iconEntries.filter(([name]) => {
    const fileName = getFileNameFromIcon(name);
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) || fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="icon-catalog flex flex-col gap-4 p-8">
      <p className="text-sm text-neutral-content-subtle">
        Hover a card for visual feedback and a copy hint; click to copy the component name.
      </p>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search icons by name or file name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded border border-neutral-border bg-neutral-background text-neutral-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus-outline w-full text-sm mb-4"
        />
      </div>

      <div className="icons-grid grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
        {filteredIcons.map(([name, Icon]) => (
          <IconItem key={name} name={name} Icon={Icon as React.ComponentType<React.SVGProps<SVGSVGElement>>} />
        ))}
      </div>
      {filteredIcons.length === 0 && (
        <div className="text-center my-10 text-neutral-content-subtle">No icons found matching "{searchTerm}"</div>
      )}
    </div>
  );
};

// Component to display icons grouped by category
const IconCatalogByCategory = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Only custom SVG icons: start with "Icon" prefix, never end with "Icon" suffix (Phosphor convention)
  const iconEntries = Object.entries(Icons).filter(
    ([name, comp]) =>
      name.startsWith("Icon") &&
      !name.endsWith("Icon") &&
      !PHOSPHOR_STORYBOOK_EXCLUSIONS.has(name) &&
      isRenderableIcon(comp),
  );

  // Group icons by category
  const categorizedIcons: Record<string, Array<[string, unknown]>> = Object.keys(categoryDescriptions).reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as Record<string, Array<[string, unknown]>>,
  );

  iconEntries.forEach((entry) => {
    const [name, Icon] = entry;
    if (!isRenderableIcon(Icon)) return;

    const category = getIconCategory(name);
    if (!categorizedIcons[category]) {
      categorizedIcons[category] = [];
    }

    categorizedIcons[category].push(entry);
  });

  // Filter categories and icons based on search term
  const filteredCategories = Object.entries(categorizedIcons)
    .map(([category, icons]) => {
      const filteredIcons = icons.filter(([name]) => {
        const fileName = getFileNameFromIcon(name);
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      return { category, icons: filteredIcons };
    })
    .filter(({ icons }) => icons.length > 0);

  return (
    <div className="icon-catalog-by-category flex flex-col gap-4 p-8">
      <p className="text-sm text-neutral-content-subtle">
        Hover a card for visual feedback and a copy hint; click to copy the component name.
      </p>
      <div className="search-container mb-5">
        <input
          type="text"
          placeholder="Search icons by name, file name, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded border border-neutral-border bg-neutral-background text-neutral-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus-outline w-full text-sm mb-4"
        />
      </div>

      {filteredCategories.map(({ category, icons }) => (
        <div key={category} className="category-section mb-10">
          <h2 className="text-lg font-bold mb-2 pb-2 border-b border-neutral-border">
            {category} ({icons.length})
          </h2>
          <p className="text-sm mb-4 text-neutral-content-subtle">
            {categoryDescriptions[category] || "Icons in this category"}
          </p>

          <div className="icons-grid grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
            {icons.map(([name, Icon]) => (
              <IconItem key={name} name={name} Icon={Icon as React.ComponentType<React.SVGProps<SVGSVGElement>>} />
            ))}
          </div>
        </div>
      ))}

      {filteredCategories.length === 0 && (
        <div className="text-center my-10 text-neutral-content-subtle">No icons found matching "{searchTerm}"</div>
      )}
    </div>
  );
};

const meta: Meta = {
  title: "UI/Icons",
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A catalog of all available icons in the system. Hover a card for hover styles and a copy hint; click to copy the component name. File names appear below custom SVG icons.",
      },
    },
  },
};

export default meta;

export const PhosphorIcons = {
  render: () => <PhosphorIconCatalog />,
  name: "Phosphor Icons",
  parameters: {
    docs: {
      description: {
        story:
          "All Phosphor icons exported as Icon.* namespace. Use size prop for sizing. Default size is 24 (set via IconContext.Provider in App root).",
      },
    },
  },
};

export const AllIcons = {
  render: () => <IconCatalog />,
  name: "Custom SVG Icons",
  parameters: {
    docs: {
      description: {
        story: "All custom Label Studio SVG icons displayed in a grid, searchable by name or file name.",
      },
    },
  },
};

export const CategorizedIcons = {
  render: () => <IconCatalogByCategory />,
  name: "Categorized Custom SVGs",
  parameters: {
    docs: {
      description: {
        story: "Custom SVG icons grouped by categories, making it easier to find related icons.",
      },
    },
  },
};
