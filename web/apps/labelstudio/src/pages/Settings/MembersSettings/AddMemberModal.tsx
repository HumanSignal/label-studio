/**
 * Modal for adding new members to a project
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, message, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { ProjectRole } from '@htx/core/types/project';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@htx/core/types/project';
import { addProjectMember } from '../../../services/projectMembers';
import { getApiInstance } from '@htx/core';

const api = getApiInstance();

interface OrgMember {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar: string | null;
    initials: string;
  };
}

interface AddMemberModalProps {
  visible: boolean;
  projectId: number;
  existingMemberIds: number[];
  onClose: () => void;
  onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  projectId,
  existingMemberIds,
  onClose,
  onMemberAdded,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOrganizationMembers();
      form.resetFields();
    }
  }, [visible]);

  const loadOrganizationMembers = async () => {
    setLoadingMembers(true);
    try {
      // Get current user's organization members
      // Assuming there's an API endpoint for this - adjust as needed
      const response = await api.invoke<{ results: OrgMember[] }>(
        'get',
        '/api/organizations/members/'
      );
      setOrgMembers(response.results || []);
    } catch (error) {
      console.error('Failed to load organization members:', error);
      message.error('Failed to load organization members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await addProjectMember(projectId, {
        user_id: values.userId,
        role: values.role,
      });

      message.success('Member added successfully');
      onMemberAdded();
      form.resetFields();
    } catch (error: any) {
      if (error?.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else if (error?.errorFields) {
        // Validation error from form
        return;
      } else {
        message.error('Failed to add member');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter out users who are already members
  const availableUsers = orgMembers.filter(
    (member) => !existingMemberIds.includes(member.user.id)
  );

  const roleOptions = [
    {
      value: 'annotator' as ProjectRole,
      label: ROLE_LABELS.annotator,
      description: ROLE_DESCRIPTIONS.annotator,
    },
    {
      value: 'reviewer' as ProjectRole,
      label: ROLE_LABELS.reviewer,
      description: ROLE_DESCRIPTIONS.reviewer,
    },
    {
      value: 'owner' as ProjectRole,
      label: ROLE_LABELS.owner,
      description: ROLE_DESCRIPTIONS.owner,
    },
  ];

  return (
    <Modal
      title="Add Project Member"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Add Member"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ role: 'annotator' }}
      >
        <Form.Item
          name="userId"
          label="Select User"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            placeholder="Choose a user from your organization"
            loading={loadingMembers}
            showSearch
            filterOption={(input, option) => {
              const userData = option?.userData;
              if (!userData) return false;
              const searchStr = `${userData.first_name} ${userData.last_name} ${userData.email} ${userData.username}`.toLowerCase();
              return searchStr.includes(input.toLowerCase());
            }}
            options={availableUsers.map((member) => ({
              value: member.user.id,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    src={member.user.avatar}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {member.user.initials}
                  </Avatar>
                  <div>
                    <div>
                      {member.user.first_name && member.user.last_name
                        ? `${member.user.first_name} ${member.user.last_name}`
                        : member.user.username || member.user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {member.user.email}
                    </div>
                  </div>
                </div>
              ),
              userData: member.user,
            }))}
            notFoundContent={
              loadingMembers
                ? 'Loading...'
                : availableUsers.length === 0
                  ? 'All organization members are already in this project'
                  : 'No users found'
            }
          />
        </Form.Item>

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select
            options={roleOptions}
            optionRender={(option) => (
              <div>
                <div style={{ fontWeight: 500 }}>{option.data.label}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {option.data.description}
                </div>
              </div>
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
