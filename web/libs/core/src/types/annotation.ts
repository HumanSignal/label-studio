/**
 * Annotation review and approval types
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'fixed';

export interface AnnotationReview {
  review_status?: ReviewStatus;
  reviewed_by?: number;
  reviewed_at?: string;
  review_comment?: string;
}

export interface AnnotationWithReview {
  id: number;
  task: number;
  project: number;
  completed_by: number;
  result: any[];
  was_cancelled: boolean;
  ground_truth: boolean;
  created_at: string;
  updated_at: string;
  lead_time?: number;
  review_status?: ReviewStatus;
  reviewed_by?: number;
  reviewed_by_info?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  reviewed_at?: string;
  review_comment?: string;
}

export interface ReviewSubmission {
  review_status: ReviewStatus;
  review_comment?: string;
}

export interface BulkReviewRequest {
  annotation_ids: number[];
  review_status: ReviewStatus;
  review_comment?: string;
}

export interface BulkReviewResponse {
  updated_count: number;
  annotations: AnnotationWithReview[];
}

/**
 * Comment and discussion types
 */
export interface CommentAuthor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
}

export interface AnnotationComment {
  id: number;
  annotation: number;
  author: CommentAuthor;
  text: string;
  parent: number | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies: AnnotationComment[];
}

export interface CommentCreate {
  text: string;
  parent?: number | null;
}

export interface CommentUpdate {
  text?: string;
  is_resolved?: boolean;
}

export interface BulkResolveCommentsRequest {
  comment_ids: number[];
  is_resolved: boolean;
}

export interface BulkResolveCommentsResponse {
  updated_count: number;
  is_resolved: boolean;
}
