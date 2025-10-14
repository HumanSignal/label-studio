import type { BezierPoint } from "./types";

export interface GlobalSelectionState {
  selectedInstances: Map<string, Set<number>>; // instanceId -> selected point indices
  activeInstanceId: string | null;
  isTransforming: boolean;
  transformerState: {
    rotation: number;
    scaleX: number;
    scaleY: number;
    centerX: number;
    centerY: number;
  } | null;
}

export interface VectorInstance {
  id: string;
  getPoints: () => BezierPoint[];
  updatePoints: (points: BezierPoint[]) => void;
  setSelectedPoints: (selectedPoints: Set<number>) => void;
  setSelectedPointIndex: (index: number | null) => void;
  onPointSelected?: (index: number | null) => void;
  onTransformationComplete?: (data: any) => void;
  getTransform: () => { zoom: number; offsetX: number; offsetY: number };
  getFitScale: () => number;
  getBounds: () => { width: number; height: number } | undefined;
  constrainToBounds?: boolean;
}

export class VectorSelectionTracker {
  private static instance: VectorSelectionTracker | null = null;
  private state: GlobalSelectionState = {
    selectedInstances: new Map(),
    activeInstanceId: null,
    isTransforming: false,
    transformerState: null,
  };
  private instances: Map<string, VectorInstance> = new Map();
  private listeners: Set<(state: GlobalSelectionState) => void> = new Set();

  private constructor() {}

  static getInstance(): VectorSelectionTracker {
    if (!VectorSelectionTracker.instance) {
      VectorSelectionTracker.instance = new VectorSelectionTracker();
    }
    return VectorSelectionTracker.instance;
  }

  // Instance Management
  registerInstance(instance: VectorInstance): void {
    this.instances.set(instance.id, instance);
  }

  unregisterInstance(instanceId: string): void {
    this.instances.delete(instanceId);
    this.state.selectedInstances.delete(instanceId);

    // If this was the active instance, clear it
    if (this.state.activeInstanceId === instanceId) {
      this.state.activeInstanceId = null;
    }

    this.notifyListeners();
  }

  // Selection Management
  selectPoints(instanceId: string, pointIndices: Set<number>): void {
    // If trying to select points and there's already an active instance that's different
    if (pointIndices.size > 0 && this.state.activeInstanceId && this.state.activeInstanceId !== instanceId) {
      return; // Block the selection
    }

    if (pointIndices.size === 0) {
      this.state.selectedInstances.delete(instanceId);
      // If this was the active instance and we're clearing selection, clear active instance
      if (this.state.activeInstanceId === instanceId) {
        this.state.activeInstanceId = null;
      }
    } else {
      this.state.selectedInstances.set(instanceId, new Set(pointIndices));
      // Set this as the active instance (first to select wins)
      this.state.activeInstanceId = instanceId;
    }

    this.notifyListeners();

    // Update the instance's local selection state
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.setSelectedPoints(pointIndices);
      instance.setSelectedPointIndex(pointIndices.size === 1 ? Array.from(pointIndices)[0] : null);
      instance.onPointSelected?.(pointIndices.size === 1 ? Array.from(pointIndices)[0] : null);
    }
  }

  // Check if an instance can have selection
  canInstanceHaveSelection(instanceId: string): boolean {
    return this.state.activeInstanceId === null || this.state.activeInstanceId === instanceId;
  }

  // Get the currently active instance ID
  getActiveInstanceId(): string | null {
    return this.state.activeInstanceId;
  }

  clearSelection(): void {
    // Clear all instance selections
    for (const [instanceId, instance] of this.instances) {
      instance.setSelectedPoints(new Set());
      instance.setSelectedPointIndex(null);
      instance.onPointSelected?.(null);
    }

    this.state.selectedInstances.clear();
    this.state.activeInstanceId = null;
    this.notifyListeners();
  }

  getGlobalSelection(): GlobalSelectionState {
    return { ...this.state };
  }

  getSelectedPoints(): Array<{ instanceId: string; pointIndex: number; point: BezierPoint }> {
    const selectedPoints: Array<{ instanceId: string; pointIndex: number; point: BezierPoint }> = [];

    for (const [instanceId, pointIndices] of this.state.selectedInstances) {
      const instance = this.instances.get(instanceId);
      if (instance) {
        const points = instance.getPoints();
        for (const pointIndex of pointIndices) {
          if (pointIndex < points.length) {
            selectedPoints.push({
              instanceId,
              pointIndex,
              point: points[pointIndex],
            });
          }
        }
      }
    }

    return selectedPoints;
  }

  // Event Listeners
  subscribe(listener: (state: GlobalSelectionState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const globalState = this.getGlobalSelection();
    for (const listener of this.listeners) {
      listener(globalState);
    }
  }

  // Utility Methods
  hasSelection(): boolean {
    return this.state.selectedInstances.size > 0;
  }

  getSelectionCount(): number {
    let count = 0;
    for (const pointIndices of this.state.selectedInstances.values()) {
      count += pointIndices.size;
    }
    return count;
  }

  isInstanceSelected(instanceId: string): boolean {
    return this.state.selectedInstances.has(instanceId);
  }

  getInstanceSelection(instanceId: string): Set<number> | undefined {
    return this.state.selectedInstances.get(instanceId);
  }
}
