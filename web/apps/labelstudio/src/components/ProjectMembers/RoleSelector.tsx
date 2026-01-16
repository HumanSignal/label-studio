/**
 * Dropdown selector for changing user roles
 */
import React, { useState } from 'react';
import { Select, message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { ProjectRole, ProjectMember } from '@htx/core/types/project';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@htx/core/types/project';
import { updateMemberRole } from '../../services/projectMembers';

interface RoleSelectorProps {
  member: ProjectMember;
  projectId: number;
  currentUserRole: ProjectRole | null;
  currentUserId: number;
  disabled?: boolean;
  onRoleChanged?: (newRole: ProjectRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  member,
  projectId,
  currentUserRole,
  currentUserId,
  disabled = false,
  onRoleChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(member.role);

  const isCurrentUser = member.user.id === currentUserId;
  const isOwner = currentUserRole === 'owner';
  const canChangeRole = isOwner && !isCurrentUser && !disabled;

  const handleRoleChange = async (newRole: ProjectRole) => {
    if (newRole === selectedRole) return;

    // Show confirmation modal for role changes
    Modal.confirm({
      title: 'Change Member Role',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to change ${member.user.first_name || member.user.email}'s role from ${ROLE_LABELS[selectedRole]} to ${ROLE_LABELS[newRole]}?`,
      okText: 'Change Role',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        try {
          await updateMemberRole(projectId, member.id, { role: newRole });
          setSelectedRole(newRole);
          message.success(`Role updated to ${ROLE_LABELS[newRole]}`);
          onRoleChanged?.(newRole);
        } catch (error: any) {
          message.error(error?.response?.data?.detail || 'Failed to update role');
          // Revert selection on error
          setSelectedRole(member.role);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const roleOptions = [
    {
      value: 'owner' as ProjectRole,
      label: ROLE_LABELS.owner,
      description: ROLE_DESCRIPTIONS.owner,
    },
    {
      value: 'reviewer' as ProjectRole,
      label: ROLE_LABELS.reviewer,
      description: ROLE_DESCRIPTIONS.reviewer,
    },
    {
      value: 'annotator' as ProjectRole,
      label: ROLE_LABELS.annotator,
      description: ROLE_DESCRIPTIONS.annotator,
    },
  ];

  return (
    <Select
      value={selectedRole}
      onChange={handleRoleChange}
      disabled={!canChangeRole || loading}
      loading={loading}
      style={{ width: 130 }}
      options={roleOptions.map((option) => ({
        ...option,
        disabled: !canChangeRole,
      }))}
      optionRender={(option) => (
        <div>
          <div style={{ fontWeight: 500 }}>{option.data.label}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>{option.data.description}</div>
        </div>
      )}
    />
  );
};
