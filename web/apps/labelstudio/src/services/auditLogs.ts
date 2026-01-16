/**
 * API service for audit logs and activity tracking
 */
import type {
  AuditLog,
  AuditLogFilters,
  AuditLogExport,
  AnnotationVersion,
  RollbackRequest,
  ProjectChangeLog,
} from '@htx/core/types/audit';

const API_BASE = '/api';

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (
  filters: AuditLogFilters
): Promise<{ results: AuditLog[]; count: number }> => {
  const params = new URLSearchParams();

  if (filters.project) params.append('project', filters.project.toString());
  if (filters.action) params.append('action', filters.action);
  if (filters.entity_type) params.append('entity_type', filters.entity_type);
  if (filters.user_id) params.append('user_id', filters.user_id.toString());
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);

  const response = await fetch(
    `${API_BASE}/projects/${filters.project}/audit-logs/?${params.toString()}`,
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
    throw new Error(error.detail || 'Failed to fetch audit logs');
  }

  return response.json();
};

/**
 * Export audit logs
 */
export const exportAuditLogs = async (
  projectId: number,
  exportParams: AuditLogExport
): Promise<AuditLog[] | Blob> => {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/audit-logs/export/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(exportParams),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to export audit logs');
  }

  if (exportParams.format === 'csv') {
    return response.blob();
  }

  return response.json();
};

/**
 * Get annotation version history
 */
export const getAnnotationHistory = async (
  annotationId: number
): Promise<AnnotationVersion[]> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/history/`,
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
    throw new Error(error.detail || 'Failed to fetch annotation history');
  }

  return response.json();
};

/**
 * Rollback annotation to a previous version
 */
export const rollbackAnnotation = async (
  annotationId: number,
  versionNumber: number
): Promise<any> => {
  const response = await fetch(
    `${API_BASE}/annotations/${annotationId}/rollback/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ version_number: versionNumber }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to rollback annotation');
  }

  return response.json();
};

/**
 * Get project change logs
 */
export const getProjectChangeLogs = async (
  projectId: number,
  changeType?: string
): Promise<ProjectChangeLog[]> => {
  const params = new URLSearchParams();
  if (changeType) params.append('change_type', changeType);

  const response = await fetch(
    `${API_BASE}/projects/${projectId}/change-logs/?${params.toString()}`,
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
    throw new Error(error.detail || 'Failed to fetch project change logs');
  }

  return response.json();
};

/**
 * Download exported audit logs as CSV
 */
export const downloadAuditLogsCsv = async (
  projectId: number,
  exportParams: Omit<AuditLogExport, 'format'>
): Promise<void> => {
  const blob = await exportAuditLogs(projectId, {
    ...exportParams,
    format: 'csv',
  }) as Blob;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_log_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
