/**
 * Audit logs and activity tracking types
 */

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign'
  | 'comment'
  | 'review'
  | 'rollback';

export type EntityType =
  | 'annotation'
  | 'task'
  | 'project'
  | 'user'
  | 'comment'
  | 'quality_score'
  | 'member'
  | 'settings';

export interface AuditLogUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AuditLog {
  id: number;
  user: AuditLogUser | null;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: number;
  project: number | null;
  description: string;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogFilters {
  project?: number;
  action?: AuditAction;
  entity_type?: EntityType;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface AuditLogExport {
  start_date?: string;
  end_date?: string;
  action?: AuditAction;
  entity_type?: EntityType;
  user_id?: number;
  format: 'json' | 'csv';
}

export interface AnnotationVersion {
  id: number;
  annotation: number;
  version_number: number;
  result: any[];
  lead_time: number | null;
  created_by: AuditLogUser | null;
  change_summary: string;
  changes_diff: Record<string, any> | null;
  created_at: string;
  is_rollback: boolean;
  rolled_back_from_version: number | null;
}

export interface RollbackRequest {
  version_number: number;
}

export type ChangeType =
  | 'settings'
  | 'members'
  | 'config'
  | 'storage'
  | 'ml'
  | 'webhook';

export interface ProjectChangeLog {
  id: number;
  project: number;
  user: AuditLogUser | null;
  field_name: string;
  old_value: string;
  new_value: string;
  change_type: ChangeType;
  description: string;
  created_at: string;
}

export interface ActivitySummary {
  total_activities: number;
  recent_activities: AuditLog[];
  top_actions: Array<{ action: AuditAction; count: number }>;
  active_users: Array<{ user: AuditLogUser; activity_count: number }>;
}
