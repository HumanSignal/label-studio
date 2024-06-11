// id and title fixed because they'll be always defined in API response
declare type APIProject = {
  id: number;

  /** Project name. Must be between 3 and 50 characters long. */
  title: string;

  /** Project description */
  description?: string | null;

  /** Label config in XML format. See more about it in documentation */
  label_config?: string | null;

  /** Labeling instructions in HTML format */
  expert_instruction?: string | null;

  /** Show instructions to the annotator before they start */
  show_instruction?: boolean;

  /** Show a skip button in interface and allow annotators to skip the task */
  show_skip_button?: boolean;

  /** Allow annotators to submit empty annotations */
  enable_empty_annotation?: boolean;

  /** Show annotation history to annotator */
  show_annotation_history?: boolean;
  organization?: number | null;
  color?: string | null;

  /** Maximum number of annotations for one task. If the number of annotations per task is equal or greater to this value, the task is completed (is_labeled=True) */
  maximum_annotations?: number;

  /** Whether or not the project is published to annotators */
  is_published?: boolean;

  /** Machine learning model version */
  model_version?: string | null;

  /** Whether or not the project is in the middle of being created */
  is_draft?: boolean;
  created_by?: APIUserSimple;

  /** @format date-time */
  created_at?: string;

  /** Minimum number of completed tasks after which model training is started */
  min_annotations_to_start_training?: number;

  /** If set, the annotator can view model predictions */
  show_collab_predictions?: boolean;
  num_tasks_with_annotations?: string;

  /** Total task number in project */
  task_number?: string;

  /** Useful annotation number in project not including skipped_annotations_number and ground_truth_number. Total annotations = annotation_number + skipped_annotations_number + ground_truth_number */
  useful_annotation_number?: string;

  /** Honeypot annotation number in project */
  ground_truth_number?: string;

  /** Skipped by collaborators annotation number in project */
  skipped_annotations_number?: string;

  /** Total annotations number in project including skipped_annotations_number and ground_truth_number. */
  total_annotations_number?: string;

  /** Total predictions number in project including skipped_annotations_number and ground_truth_number. */
  total_predictions_number?: string;
  sampling?: "Sequential sampling" | "Uniform sampling" | "Uncertainty sampling" | null;
  show_ground_truth_first?: boolean;
  show_overlap_first?: boolean;
  overlap_cohort_percentage?: number;

  /** Task data credentials: login */
  task_data_login?: string | null;

  /** Task data credentials: password */
  task_data_password?: string | null;

  /** Weights for control tags */
  control_weights?: Record<string, unknown> | null;

  /** JSON-formatted labeling configuration */
  parsed_label_config?: string;
};
