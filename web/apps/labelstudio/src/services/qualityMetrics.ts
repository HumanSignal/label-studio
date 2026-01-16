/**
 * API service for quality control and metrics
 */
import type {
  AnnotationMetrics,
  QualityScore,
  QualityScoreCreate,
  AnnotatorMetrics,
  ProjectMetrics,
} from '@htx/core/types/quality';

const API_BASE = '/api';

/**
 * Get metrics for a specific annotation
 */
export const getAnnotationMetrics = async (
  annotationId: number
): Promise<AnnotationMetrics> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/metrics/`,
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
    throw new Error(error.detail || 'Failed to fetch annotation metrics');
  }

  return response.json();
};

/**
 * Update metrics for a specific annotation
 */
export const updateAnnotationMetrics = async (
  annotationId: number,
  metrics: Partial<AnnotationMetrics>
): Promise<AnnotationMetrics> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/metrics/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(metrics),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update annotation metrics');
  }

  return response.json();
};

/**
 * Get quality scores for an annotation
 */
export const getQualityScores = async (
  annotationId: number
): Promise<QualityScore[]> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/quality-scores/`,
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
    throw new Error(error.detail || 'Failed to fetch quality scores');
  }

  return response.json();
};

/**
 * Submit a quality score for an annotation
 */
export const submitQualityScore = async (
  annotationId: number,
  score: QualityScoreCreate
): Promise<QualityScore> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/quality-scores/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(score),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit quality score');
  }

  return response.json();
};

/**
 * Get project-level metrics
 */
export const getProjectMetrics = async (
  projectId: number
): Promise<ProjectMetrics> => {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/metrics/`,
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
    throw new Error(error.detail || 'Failed to fetch project metrics');
  }

  return response.json();
};

/**
 * Get annotator-level metrics for a project
 */
export const getAnnotatorMetrics = async (
  projectId: number
): Promise<AnnotatorMetrics[]> => {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/annotator-metrics/`,
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
    throw new Error(error.detail || 'Failed to fetch annotator metrics');
  }

  return response.json();
};
