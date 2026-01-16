/**
 * Quality control and metrics types
 */

export interface AnnotationMetrics {
  id: number;
  annotation: number;
  time_spent: number | null;
  quality_score: number | null;
  accuracy_score: number | null;
  agreement_score: number | null;
  num_regions: number;
  num_revisions: number;
  is_outlier: boolean;
  needs_review: boolean;
  calculated_at: string;
}

export interface QualityScoreReviewer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
}

export interface QualityScore {
  id: number;
  annotation: number;
  reviewer: QualityScoreReviewer;
  score: number;
  completeness_score: number | null;
  accuracy_score: number | null;
  consistency_score: number | null;
  feedback: string;
  created_at: string;
  updated_at: string;
}

export interface QualityScoreCreate {
  score: number;
  completeness_score?: number | null;
  accuracy_score?: number | null;
  consistency_score?: number | null;
  feedback?: string;
}

export interface AnnotatorMetrics {
  annotator_id: number;
  annotator_name: string;
  total_annotations: number;
  average_quality_score: number;
  average_accuracy_score: number;
  average_time_spent: number;
  approval_rate: number;
  rejection_rate: number;
  annotations_per_day: number;
}

export interface ProjectMetrics {
  total_annotations: number;
  total_tasks: number;
  completion_rate: number;
  average_quality_score: number;
  average_agreement_score: number;
  annotations_needing_review: number;
  outlier_count: number;
  annotator_count: number;
  avg_annotations_per_annotator: number;
}

export interface QualityTrend {
  date: string;
  average_quality: number;
  annotations_count: number;
}

export interface AnnotatorPerformance {
  annotator_id: number;
  annotator_name: string;
  metrics: AnnotatorMetrics;
  trend: QualityTrend[];
}
