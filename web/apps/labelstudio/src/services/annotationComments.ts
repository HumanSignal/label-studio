/**
 * API service for annotation comments and discussions
 */
import type {
  AnnotationComment,
  CommentCreate,
  CommentUpdate,
  BulkResolveCommentsRequest,
  BulkResolveCommentsResponse,
} from '@htx/core/types/annotation';

const API_BASE = '/api';

/**
 * Get all comments for an annotation
 */
export const getComments = async (
  annotationId: number
): Promise<AnnotationComment[]> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/comments/`,
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
    throw new Error(error.detail || 'Failed to fetch comments');
  }

  return response.json();
};

/**
 * Create a new comment on an annotation
 */
export const createComment = async (
  annotationId: number,
  comment: CommentCreate
): Promise<AnnotationComment> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/comments/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(comment),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create comment');
  }

  return response.json();
};

/**
 * Update a comment
 */
export const updateComment = async (
  commentId: number,
  update: CommentUpdate
): Promise<AnnotationComment> => {
  const response = await fetch(
    `${API_BASE}/comments/${commentId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(update),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update comment');
  }

  return response.json();
};

/**
 * Delete a comment
 */
export const deleteComment = async (
  commentId: number
): Promise<void> => {
  const response = await fetch(
    `${API_BASE}/comments/${commentId}/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete comment');
  }
};

/**
 * Resolve or unresolve a comment thread
 */
export const resolveComment = async (
  commentId: number,
  isResolved: boolean = true
): Promise<AnnotationComment> => {
  const response = await fetch(
    `${API_BASE}/comments/${commentId}/resolve/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ is_resolved: isResolved }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to resolve comment');
  }

  return response.json();
};

/**
 * Bulk resolve multiple comments
 */
export const bulkResolveComments = async (
  annotationId: number,
  request: BulkResolveCommentsRequest
): Promise<BulkResolveCommentsResponse> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/comments/bulk-resolve/`,
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
    throw new Error(error.detail || 'Failed to bulk resolve comments');
  }

  return response.json();
};
