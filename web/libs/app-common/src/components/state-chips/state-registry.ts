/**
 * State Registry System for Label Studio
 *
 * This module provides an extensible state management system that allows
 * Label Studio Enterprise to extend state definitions without modifying base code.
 *
 * Instead of mapping states directly to colors (CREATED → "grey"), we use semantic
 * types that represent meaning (CREATED → StateType.INITIAL → neutral styling).
 *
 * This allows:
 * - Clear intent when reading code (TERMINAL vs green)
 * - Easy visual redesigns without touching logic
 * - Consistent styling across similar state types
 * - Entity-specific tooltips (same state, different descriptions)
 * - LSE extension without modifying LSO code
 */

/**
 * Semantic state categories that define the meaning and visual representation of states.
 *
 * States are not just colors - they represent different phases in a workflow:
 * - INITIAL: Starting point, newly created entities
 * - IN_PROGRESS: Active work happening
 * - ATTENTION: Requires intervention or review
 * - TERMINAL: Completed, no further changes expected
 */
export enum StateType {
  INITIAL = "initial",
  IN_PROGRESS = "in_progress",
  ATTENTION = "attention",
  TERMINAL = "terminal",
}

/**
 * Entity types that can have states.
 * Used for entity-specific tooltip lookup.
 */
export type EntityType = "task" | "annotation" | "project" | "annotationreview";

/**
 * State metadata including type, label, and entity-specific tooltips.
 */
export interface StateMetadata {
  /** Semantic state type determining visual styling */
  type: StateType;

  /** Human-readable label for display (defaults to formatted state name if not provided) */
  label?: string;

  /** Entity-specific tooltip descriptions */
  tooltips?: Partial<Record<EntityType, string>>;
}

/**
 * Tailwind CSS classes for each state type.
 * Using semantic design tokens for maintainable theming.
 */
const STATE_TYPE_STYLES: Record<StateType, string> = {
  [StateType.INITIAL]: "bg-neutral-emphasis border-neutral-border text-neutral-content",
  [StateType.IN_PROGRESS]: "bg-primary-emphasis border-primary-border-subtlest text-primary-content",
  [StateType.ATTENTION]: "bg-warning-emphasis border-warning-border-subtlest text-warning-content",
  [StateType.TERMINAL]: "bg-positive-emphasis border-positive-border-subtlest text-positive-content",
};

/**
 * Central registry for state definitions.
 *
 * This singleton class provides:
 * - Registration of state metadata
 * - Lookup of state types and tooltips
 * - Extension mechanism for LSE
 */
class StateRegistry {
  private states = new Map<string, StateMetadata>();

  /**
   * Register a state with its metadata.
   * Can be called multiple times for the same state to update metadata.
   *
   * @param state - State constant (e.g., 'CREATED', 'IN_PROGRESS')
   * @param metadata - State type, label, and tooltips
   */
  register(state: string, metadata: StateMetadata): void {
    this.states.set(state, metadata);
  }

  /**
   * Register multiple states at once.
   * Useful for batch registration of related states.
   *
   * @param states - Map of state constants to metadata
   */
  registerBatch(states: Record<string, StateMetadata>): void {
    Object.entries(states).forEach(([state, metadata]) => {
      this.register(state, metadata);
    });
  }

  /**
   * Get the semantic type of a state.
   * Falls back to INITIAL if state is not registered.
   *
   * @param state - State constant
   * @returns StateType enum value
   */
  getType(state: string): StateType {
    return this.states.get(state)?.type ?? StateType.INITIAL;
  }

  /**
   * Get the display label for a state.
   * Falls back to formatted state name if no label is registered.
   *
   * @param state - State constant
   * @returns Human-readable label
   */
  getLabel(state: string): string {
    const metadata = this.states.get(state);
    return metadata?.label ?? this.formatStateName(state);
  }

  /**
   * Get the tooltip description for a state + entity combination.
   * Falls back to generic description if no entity-specific tooltip exists.
   *
   * @param state - State constant
   * @param entityType - Type of entity (task, project, etc.)
   * @returns Tooltip text
   */
  getTooltip(state: string, entityType: EntityType): string {
    const metadata = this.states.get(state);

    if (!metadata?.tooltips) {
      // No tooltips defined, return generic description
      return `${this.getLabel(state)} state`;
    }

    // Look up entity-specific tooltip, fall back to first available tooltip
    const entityTooltip = metadata.tooltips[entityType];
    if (entityTooltip) {
      return entityTooltip;
    }

    // Fall back to any available tooltip
    const firstTooltip = Object.values(metadata.tooltips)[0];
    return firstTooltip ?? `${this.getLabel(state)} state`;
  }

  /**
   * Get Tailwind CSS classes for a state's visual styling.
   *
   * @param state - State constant
   * @returns Space-separated Tailwind class names
   */
  getStyleClasses(state: string): string {
    const stateType = this.getType(state);
    return STATE_TYPE_STYLES[stateType];
  }

  /**
   * Check if a state is registered.
   *
   * @param state - State constant
   * @returns true if state is registered
   */
  isRegistered(state: string): boolean {
    return this.states.has(state);
  }

  /**
   * Get all registered states.
   * Useful for debugging and testing.
   *
   * @returns Array of state constants
   */
  getAllStates(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Format a state constant into a human-readable name.
   * Converts SNAKE_CASE to Title Case.
   *
   * @param state - State constant (e.g., 'ANNOTATION_IN_PROGRESS')
   * @returns Formatted name (e.g., 'Annotation In Progress')
   */
  private formatStateName(state: string): string {
    return state
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
}

/**
 * Singleton instance of the state registry.
 * Import this to register or query states.
 */
export const stateRegistry = new StateRegistry();

// ============================================================================
// Core State Registrations (Label Studio Open Source)
// ============================================================================

/**
 * Task states covering annotation, review, and arbitration workflow.
 */
stateRegistry.registerBatch({
  CREATED: {
    type: StateType.INITIAL,
    label: "Created",
    tooltips: {
      task: "Task has been created and is ready for annotation",
      annotation: "Annotation has been created",
    },
  },

  ANNOTATION_IN_PROGRESS: {
    type: StateType.IN_PROGRESS,
    label: "Annotating",
    tooltips: {
      task: "Task is currently being annotated",
    },
  },

  ANNOTATION_COMPLETE: {
    type: StateType.TERMINAL,
    label: "Annotated",
    tooltips: {
      task: "Annotation has been completed and is ready for review",
    },
  },

  REVIEW_IN_PROGRESS: {
    type: StateType.IN_PROGRESS,
    label: "In Review",
    tooltips: {
      task: "Task is currently being reviewed",
      annotationreview: "Review is in progress",
    },
  },

  REVIEW_COMPLETE: {
    type: StateType.TERMINAL,
    label: "Reviewed",
    tooltips: {
      task: "Review has been completed",
      annotationreview: "Review has been completed",
    },
  },

  ARBITRATION_NEEDED: {
    type: StateType.ATTENTION,
    label: "Needs Arbitration",
    tooltips: {
      task: "Task requires arbitration due to conflicting annotations or reviews",
    },
  },

  ARBITRATION_IN_PROGRESS: {
    type: StateType.IN_PROGRESS,
    label: "In Arbitration",
    tooltips: {
      task: "Arbitration is currently in progress to resolve conflicts",
    },
  },

  ARBITRATION_COMPLETE: {
    type: StateType.TERMINAL,
    label: "Arbitrated",
    tooltips: {
      task: "Arbitration has been completed",
    },
  },

  COMPLETED: {
    type: StateType.TERMINAL,
    label: "Done",
    tooltips: {
      task: "Task is fully completed and no further work is needed",
      annotation: "Annotation is completed and finalized",
      project: "Project is completed - all tasks are done",
    },
  },
});

/**
 * Annotation states for individual annotation lifecycle.
 */
stateRegistry.registerBatch({
  SUBMITTED: {
    type: StateType.IN_PROGRESS,
    label: "Submitted",
    tooltips: {
      annotation: "Annotation has been submitted for review",
    },
  },

  IN_REVIEW: {
    type: StateType.IN_PROGRESS,
    label: "In Review",
    tooltips: {
      annotation: "Annotation is currently being reviewed",
    },
  },

  APPROVED: {
    type: StateType.TERMINAL,
    label: "Approved",
    tooltips: {
      annotation: "Annotation has been approved by reviewer",
    },
  },

  REJECTED: {
    type: StateType.ATTENTION,
    label: "Rejected",
    tooltips: {
      annotation: "Annotation has been rejected and needs revision",
    },
  },
});

/**
 * Project states for project lifecycle (LSO base states).
 */
stateRegistry.registerBatch({
  PUBLISHED: {
    type: StateType.IN_PROGRESS,
    label: "Published",
    tooltips: {
      project: "Project is published and available for annotation work",
    },
  },

  IN_PROGRESS: {
    type: StateType.IN_PROGRESS,
    label: "In Progress",
    tooltips: {
      task: "Task is in progress",
      project: "Annotation work is in progress on this project",
    },
  },
});

/**
 * Annotation Review states.
 */
stateRegistry.registerBatch({
  PENDING: {
    type: StateType.INITIAL,
    label: "Pending",
    tooltips: {
      annotationreview: "Review is pending",
    },
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Tailwind CSS classes for a state's visual styling.
 *
 * @param state - State constant (e.g., 'CREATED', 'IN_PROGRESS')
 * @returns Space-separated Tailwind class names
 */
export function getStateColorClass(state: string): string {
  return stateRegistry.getStyleClasses(state);
}

/**
 * Format a state constant into a human-readable name.
 *
 * @param state - State constant (e.g., 'ANNOTATION_IN_PROGRESS')
 * @returns Formatted name (e.g., 'Annotating')
 */
export function formatStateName(state: string): string {
  return stateRegistry.getLabel(state);
}

/**
 * Get the tooltip description for a state + entity combination.
 *
 * @param state - State constant
 * @param entityType - Type of entity (task, annotation, project, annotationreview)
 * @returns Tooltip description text
 */
export function getStateDescription(state: string, entityType: EntityType = "task"): string {
  return stateRegistry.getTooltip(state, entityType);
}

/**
 * Get the semantic type of a state.
 * Useful for conditional logic based on state category.
 *
 * @param state - State constant
 * @returns StateType enum value
 */
export function getStateType(state: string): StateType {
  return stateRegistry.getType(state);
}

/**
 * Check if a state represents a terminal (completed) state.
 *
 * @param state - State constant
 * @returns true if state is terminal
 */
export function isTerminalState(state: string): boolean {
  return stateRegistry.getType(state) === StateType.TERMINAL;
}

/**
 * Check if a state requires attention/intervention.
 *
 * @param state - State constant
 * @returns true if state requires attention
 */
export function requiresAttention(state: string): boolean {
  return stateRegistry.getType(state) === StateType.ATTENTION;
}
