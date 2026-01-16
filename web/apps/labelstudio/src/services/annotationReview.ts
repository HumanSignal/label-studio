/**
 * API service for annotation review and approval
 */
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import type {
  AnnotationWithReview,
  ReviewSubmission,
  BulkReviewRequest,
  BulkReviewResponse,
  ReviewStatus,
} from '@htx/core/types/annotation';

const API_BASE = '/api';

/**
 * Get annotations in the review queue for a project
 */
export const getReviewQueue = async (
  projectId: number,
  params?: {
    status?: ReviewStatus;
    annotator?: number;
  }
): Promise<AnnotationWithReview[]> => {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append('status', params.status);
  }

  if (params?.annotator) {
    queryParams.append('annotator', params.annotator.toString());
  }

  const response = await fetch(
    `${API_BASE}/projects/${projectId}/annotations/review-queue/?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch review queue');
  }

  return response.json();
};

/**
 * Submit a review for an annotation
 */
export const submitReview = async (
  annotationId: number,
  review: ReviewSubmission
): Promise<AnnotationWithReview> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/review/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(review),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit review');
  }

  return response.json();
};

/**
 * Bulk review multiple annotations
 */
export const bulkReview = async (
  projectId: number,
  request: BulkReviewRequest
): Promise<BulkReviewResponse> => {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/annotations/bulk-review/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to bulk review annotations');
  }

  return response.json();
};
