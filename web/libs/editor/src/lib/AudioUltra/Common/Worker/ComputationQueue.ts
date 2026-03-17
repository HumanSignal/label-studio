import { ComputationWorkerQueue } from "./ComputationWorkerQueue";

// Priority levels for computation tasks
export enum TaskPriority {
  HIGH = "high",
  NORMAL = "normal",
  LOW = "low",
}

// Interface for progress details per priority level
export interface PriorityProgress {
  queued: number;
  active: number;
  processed: number; // Processed since last clearly for this priority
}

// Updated interface for overall progress, broken down by priority
export interface ComputationProgress {
  high: PriorityProgress;
  normal: PriorityProgress;
  low: PriorityProgress;
  totalAdded: number; // Total added across all priorities since clear
  totalProcessed: number; // Total processed across all priorities since clear
  overallPercentage: number; // Based on totalProcessed / totalAdded
}

// Queue options for initialization
export interface ComputationQueueOptions<_T = any> {
  onCleared?: () => void | Promise<void>;
  onProgress?: (progress: DetailedComputationProgress) => void | Promise<void>; // New signature
  onBatchComplete?: (batchId: string, metadata: any) => void;
  onAllCategoryComplete?: (priority: TaskPriority) => void;
  highBatchSize?: number;
  normalBatchSize?: number;
  lowBatchSize?: number;
}

// Task definition interface
export interface ComputationTask<T = any> {
  id: string;
  priority: TaskPriority;
  batchId: string; // Added batchId
  execute: () => T | Promise<T>; // Allow non-promise return? Assuming processor handles wrapping
}

// --- New Detailed Progress Interfaces (May move to Processor) ---
export interface BatchProgress {
  id: string;
  priority: TaskPriority;
  metadata: any;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  queuedTasks: number;
  percentage: number;
}

export interface DetailedComputationProgress {
  batches: BatchProgress[];
  overall: {
    totalAdded: number; // Since last clear
    totalProcessed: number; // Since last clear
    overallPercentage: number;
  };
}
// --- End New Interfaces ---

/**
 * A queue for managing computational tasks with different priorities
 */
export class ComputationQueue<T = any> {
  private highWorker: ComputationWorkerQueue;
  private normalWorker: ComputationWorkerQueue;
  private lowWorker: ComputationWorkerQueue;
  private running = false;
  private runLoopTimeout: any = null;
  private options: ComputationQueueOptions<T>;
  private nextBatchId = 0;
  // Track active batch counts by priority
  private activeBatchCounts: Record<TaskPriority, Set<string>> = {
    [TaskPriority.HIGH]: new Set(),
    [TaskPriority.NORMAL]: new Set(),
    [TaskPriority.LOW]: new Set(),
  };

  constructor(options: ComputationQueueOptions<T> = {}) {
    this.options = options;
    // Wrap onBatchComplete to track batch completion by priority
    const userOnBatchComplete = options.onBatchComplete;
    const wrappedOnBatchComplete = (batchId: string, metadata: any) => {
      const priority: TaskPriority = metadata?.priority;
      if (priority && this.activeBatchCounts[priority]) {
        this.activeBatchCounts[priority].delete(batchId);
        if (this.activeBatchCounts[priority].size === 0 && this.options.onAllCategoryComplete) {
          this.options.onAllCategoryComplete(priority);
        }
      }
      if (userOnBatchComplete) userOnBatchComplete(batchId, metadata);
    };
    this.highWorker = new ComputationWorkerQueue("high", options.highBatchSize ?? 10, TaskPriority.HIGH);
    this.normalWorker = new ComputationWorkerQueue("normal", options.normalBatchSize ?? 5, TaskPriority.NORMAL);
    this.lowWorker = new ComputationWorkerQueue("low", options.lowBatchSize ?? 1, TaskPriority.LOW);
    this.highWorker.onBatchComplete = wrappedOnBatchComplete;
    this.normalWorker.onBatchComplete = wrappedOnBatchComplete;
    this.lowWorker.onBatchComplete = wrappedOnBatchComplete;
    if (options.onProgress) {
      const aggregateProgress = () => {
        // Gather progress from all workers
        const high = this.highWorker;
        const normal = this.normalWorker;
        const low = this.lowWorker;
        const batches = [
          {
            priority: TaskPriority.HIGH,
            pendingTasks: high.pendingTaskCount,
            pendingBatches: high.pendingBatchCount,
            totalTasks: high.globalTasksAdded,
            processedTasks: high.globalTasksProcessed,
          },
          {
            priority: TaskPriority.NORMAL,
            pendingTasks: normal.pendingTaskCount,
            pendingBatches: normal.pendingBatchCount,
            totalTasks: normal.globalTasksAdded,
            processedTasks: normal.globalTasksProcessed,
          },
          {
            priority: TaskPriority.LOW,
            pendingTasks: low.pendingTaskCount,
            pendingBatches: low.pendingBatchCount,
            totalTasks: low.globalTasksAdded,
            processedTasks: low.globalTasksProcessed,
          },
        ];
        const totalAdded = batches.reduce((sum, b) => sum + b.totalTasks, 0);
        const totalProcessed = batches.reduce((sum, b) => sum + b.processedTasks, 0);
        const overallPercentage = totalAdded > 0 ? Math.round((totalProcessed / totalAdded) * 100) : 0;
        options.onProgress!({
          batches: [], // You can fill this with more detail if needed
          overall: { totalAdded, totalProcessed, overallPercentage },
        });
      };
      this.highWorker.onProgress = aggregateProgress;
      this.normalWorker.onProgress = aggregateProgress;
      this.lowWorker.onProgress = aggregateProgress;
    }
  }

  public addBatch(tasks: { id: string; priority: TaskPriority; taskFn: () => Promise<any> }[], metadata: any): string {
    const batchId = `batch-${this.nextBatchId++}`;
    // Split tasks by priority
    const highTasks = tasks
      .filter((t) => t.priority === TaskPriority.HIGH)
      .map((t) => ({ id: t.id, taskFn: t.taskFn }));
    const normalTasks = tasks
      .filter((t) => t.priority === TaskPriority.NORMAL)
      .map((t) => ({ id: t.id, taskFn: t.taskFn }));
    const lowTasks = tasks.filter((t) => t.priority === TaskPriority.LOW).map((t) => ({ id: t.id, taskFn: t.taskFn }));
    if (highTasks.length > 0) {
      this.highWorker.addBatch(batchId, highTasks, metadata);
      this.activeBatchCounts[TaskPriority.HIGH].add(batchId);
    }
    if (normalTasks.length > 0) {
      this.normalWorker.addBatch(batchId, normalTasks, metadata);
      this.activeBatchCounts[TaskPriority.NORMAL].add(batchId);
    }
    if (lowTasks.length > 0) {
      this.lowWorker.addBatch(batchId, lowTasks, metadata);
      this.activeBatchCounts[TaskPriority.LOW].add(batchId);
    }
    this.startRunLoop();
    return batchId;
  }

  public clear(): void {
    this.highWorker.clear();
    this.normalWorker.clear();
    this.lowWorker.clear();
    this.version++;
    this.activeBatchCounts[TaskPriority.HIGH].clear();
    this.activeBatchCounts[TaskPriority.NORMAL].clear();
    this.activeBatchCounts[TaskPriority.LOW].clear();
    if (this.runLoopTimeout) {
      clearTimeout(this.runLoopTimeout);
      this.runLoopTimeout = null;
    }
    this.running = false;
    if (this.options.onCleared) {
      try {
        this.options.onCleared();
      } catch (err) {
        console.error("Error in ComputationQueue onCleared callback:", err);
      }
    }
  }

  private startRunLoop() {
    if (this.running) return;
    this.running = true;
    this.runLoop();
  }

  private emitAggregateProgress() {
    if (this.options.onProgress) {
      const highBatches = this.highWorker.getAllBatchProgresses(TaskPriority.HIGH);
      const normalBatches = this.normalWorker.getAllBatchProgresses(TaskPriority.NORMAL);
      const lowBatches = this.lowWorker.getAllBatchProgresses(TaskPriority.LOW);
      // Concatenate: all high, all normal, all low
      const batches = [...highBatches, ...normalBatches, ...lowBatches];
      const totalAdded = batches.reduce((sum, b) => sum + b.totalTasks, 0);
      const totalProcessed = batches.reduce((sum, b) => sum + b.completedTasks, 0);
      const overallPercentage = totalAdded > 0 ? Math.round((totalProcessed / totalAdded) * 100) : 0;
      this.options.onProgress({
        batches,
        overall: { totalAdded, totalProcessed, overallPercentage },
      });
    }
  }

  private async runLoop() {
    if (!this.running) return;
    const workers = [this.highWorker, this.normalWorker, this.lowWorker];
    let processed = false;
    for (const worker of workers) {
      if (worker.hasPendingTasks()) {
        await worker.processChunk();
        this.emitAggregateProgress();
        processed = true;
        break;
      }
    }
    if (processed && this.running) {
      this.runLoopTimeout = setTimeout(() => this.runLoop(), 0);
    } else {
      this.running = false;
    }
  }

  /**
   * Check if a task is pending in the queue.
   * @param id Task identifier
   * @returns True if the task is pending
   */
  public hasTask(_id: string): boolean {
    // No direct hasTask, but we can check if any batch contains the task
    // For now, just check if there are pending tasks
    return this.highWorker.hasPendingTasks() || this.normalWorker.hasPendingTasks() || this.lowWorker.hasPendingTasks();
  }

  /**
   * Get the number of tasks in the queue
   * @returns Total number of tasks waiting to be processed
   */
  public getQueueSize(): number {
    return this.highWorker.pendingTaskCount + this.normalWorker.pendingTaskCount + this.lowWorker.pendingTaskCount;
  }

  /**
   * Get counts for each priority queue
   * @returns Object with counts for each priority level
   */
  public getQueueSizes() {
    return {
      high: this.highWorker.pendingTaskCount,
      normal: this.normalWorker.pendingTaskCount,
      low: this.lowWorker.pendingTaskCount,
      total: this.getQueueSize(),
    };
  }

  public cancelBatchesByPriority(priorities: TaskPriority[]) {
    this.highWorker.cancelBatchesByPriority(priorities);
    this.normalWorker.cancelBatchesByPriority(priorities);
    this.lowWorker.cancelBatchesByPriority(priorities);
  }
}
