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
   * Get states that apply to a specific entity type.
   * A state applies to an entity if it has a tooltip defined for that entity type.
   *
   * @param entityType - Type of entity (task, annotation, project, annotationreview)
   * @returns Array of state constants applicable to the entity type
   */
  getStatesByEntityType(entityType: EntityType): string[] {
    return Array.from(this.states.entries())
      .filter(([_, metadata]) => metadata.tooltips && entityType in metadata.tooltips)
      .sort((a, b) => {
        // Sort by logical workflow order: INITIAL → IN_PROGRESS → ATTENTION → TERMINAL
        const workflowOrder = [StateType.INITIAL, StateType.IN_PROGRESS, StateType.ATTENTION, StateType.TERMINAL];
        const aType = this.getType(a[0]);
        const bType = this.getType(b[0]);
        const typeDiff = workflowOrder.indexOf(aType) - workflowOrder.indexOf(bType);
        if (typeDiff !== 0) return typeDiff;

        // Within each type, sort by label alphabetically
        // BUT: Special cases for specific states
        const aState = a[0];
        const bState = b[0];

        // Special case: IN_PROGRESS state should be first in its type group
        if (aState === "IN_PROGRESS") return -1;
        if (bState === "IN_PROGRESS") return 1;

        // Special case: COMPLETED (Done) should always be last
        if (aState === "COMPLETED") return 1;
        if (bState === "COMPLETED") return -1;

        // Otherwise sort by label alphabetically
        const aLabel = this.getLabel(aState);
        const bLabel = this.getLabel(bState);
        return aLabel.localeCompare(bLabel);
      })
      .map(([state]) => state);
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
 * Minimal LSO states - just the basics.
 * All review, arbitration, and advanced workflow states are in LSE.
 */
stateRegistry.registerBatch({
  CREATED: {
    type: StateType.INITIAL,
    label: "Initial",
    tooltips: {
      task: "Task has been created and is ready for annotation",
      annotation: "Annotation has been created",
      project: "Project has been created and is ready for configuration",
    },
  },

  ANNOTATION_IN_PROGRESS: {
    type: StateType.IN_PROGRESS,
    label: "Annotating",
    tooltips: {
      task: "Task is currently being annotated",
      project: "Annotation work is in progress on this project",
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
