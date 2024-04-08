type DateTime = string;

export interface APIAnnotation {
  id: number;
  created_username?: string;
  created_ago: string;
  completed_by?: string;

  ground_truth?: string;
  result?: APIResult[];

  was_cancelled?: boolean; // skipped

  created_at: DateTime;
  updated_at?: DateTime;
  draft_created_at?: DateTime;

  /** How much time it took to annotate the task */
  lead_time?: number | null;

  task?: number | null;
}

export interface APIPrediction {
  id: number;
  model_version: string;

  created_ago: string;

  result?: APIResult;
  score?: number | null;
  cluster?: number | null;
  neighbors?: Array<number>;
  mislabeling?: number;

  created_at: DateTime;
  updated_at?: DateTime;
  task: number;
}

export interface APIResult {
  id: string;
  from_name: string;
  to_name: string;
  type: string; // @todo enum
  value: Record<string, any>;
}

export interface APITask {
  id: number;
  data: Record<string, any>;
  meta?: any | null;

  created_at?: DateTime;
  updated_at?: DateTime;

  is_labeled?: boolean;
  overlap?: number;

  project?: number | null;

  file_upload?: number | null;
  annotations?: APIAnnotation[];
  predictions?: APIPrediction[];
}

export interface LSFTaskData {
  id: number;
  data: any;
  createdAt?: DateTime;
  annotations: LSFAnnotationData[];
  predictions: LSFAnnotationData[];
}

export interface LSFTask extends LSFTaskData {
  annotations: LSFAnnotation[];
  predictions: LSFAnnotation[];
}

export interface LSFAnnotationData {
  id?: string;

  pk: string; // @todo oh, it's complicated

  createdDate: DateTime;
  createdAgo: string;
  createdBy?: string;

  leadTime?: number;

  skipped?: boolean;
}

export interface LSFAnnotation extends LSFAnnotationData {
  // @todo also complicated
  userGenerate?: boolean;
  sentUserGenerate?: boolean;

  // editable: boolean;

  serializeAnnotation(): APIResult[];
}
