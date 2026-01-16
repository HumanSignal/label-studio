/**
 * Badge component for displaying user roles with appropriate colors
 */
import React from 'react';
import { Tag } from 'antd';
import type { ProjectRole } from '@htx/core/types/project';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS } from '@htx/core/types/project';

interface RoleBadgeProps {
  role: ProjectRole;
  showTooltip?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showTooltip = true }) => {
  const label = ROLE_LABELS[role];
  const color = ROLE_COLORS[role];
  const description = ROLE_DESCRIPTIONS[role];

  return (
    <Tag
      color={color}
      title={showTooltip ? description : undefined}
      style={{
        fontWeight: 500,
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '4px',
      }}
    >
      {label}
    </Tag>
  );
};
