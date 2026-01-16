/**
 * Project Members Settings Page
 * Allows project owners to manage team members and their roles
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Avatar, Space, Modal, message, Spin, Typography } from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';
import type { ProjectMember, ProjectRole } from '@htx/core/types/project';
import { getPermissionsFromRole } from '@htx/core/types/project';
import { RoleBadge } from '../../../components/ProjectMembers/RoleBadge';
import { RoleSelector } from '../../../components/ProjectMembers/RoleSelector';
import { AddMemberModal } from './AddMemberModal';
import { listProjectMembers, removeMember } from '../../../services/projectMembers';
import './MembersSettings.scss';

const { Title, Text } = Typography;

interface MembersSettingsProps {
  currentUserRole?: ProjectRole | null;
  currentUserId?: number;
}

export const MembersSettings: React.FC<MembersSettingsProps> = ({
  currentUserRole,
  currentUserId
}) => {
  const { id: projectId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const permissions = getPermissionsFromRole(currentUserRole || null);
  const canManage = permissions.canManageMembers;

  useEffect(() => {
    if (projectId) {
      loadMembers();
    }
  }, [projectId]);

  const loadMembers = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const membersList = await listProjectMembers(parseInt(projectId));
      setMembers(membersList);
    } catch (error: any) {
      message.error('Failed to load members');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (member: ProjectMember) => {
    if (!projectId) return;

    Modal.confirm({
      title: 'Remove Member',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to remove ${member.user.first_name || member.user.email} from this project?`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await removeMember(parseInt(projectId), member.id);
          message.success('Member removed successfully');
          loadMembers();
        } catch (error: any) {
          message.error(error?.response?.data?.detail || 'Failed to remove member');
        }
      },
    });
  };

  const handleRoleChanged = () => {
    loadMembers();
  };

  const handleMemberAdded = () => {
    setAddModalVisible(false);
    loadMembers();
  };

  const columns: ColumnsType<ProjectMember> = [
    {
      title: 'Member',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar
            size="default"
            icon={<UserOutlined />}
            src={record.user.avatar}
            style={{ backgroundColor: '#1890ff' }}
          >
            {record.user.initials}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.user.first_name && record.user.last_name
                ? `${record.user.first_name} ${record.user.last_name}`
                : record.user.username || record.user.email}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 150,
      render: (_, record) =>
        canManage && projectId && currentUserId ? (
          <RoleSelector
            member={record}
            projectId={parseInt(projectId)}
            currentUserRole={currentUserRole || null}
            currentUserId={currentUserId}
            onRoleChanged={handleRoleChanged}
          />
        ) : (
          <RoleBadge role={record.role} />
        ),
    },
    {
      title: 'Joined',
      key: 'created_at',
      width: 150,
      render: (_, record) => new Date(record.created_at).toLocaleDateString(),
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          {canManage && currentUserId && record.user.id !== currentUserId && (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveMember(record)}
            >
              Remove
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="members-settings">
      <div className="members-settings__header">
        <div>
          <Title level={4}>Project Members</Title>
          <Text type="secondary">
            Manage team members and their roles in this project
          </Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            Add Member
          </Button>
        )}
      </div>

      <div className="members-settings__content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={members}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'No members found' }}
          />
        )}
      </div>

      {canManage && projectId && (
        <AddMemberModal
          visible={addModalVisible}
          projectId={parseInt(projectId)}
          existingMemberIds={members.map((m) => m.user.id)}
          onClose={() => setAddModalVisible(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  );
};
