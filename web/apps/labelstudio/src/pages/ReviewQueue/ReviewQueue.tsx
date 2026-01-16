/**
 * Review Queue page - displays annotations pending review
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Select, Table, Tag, Typography, Modal, Input, message, Drawer } from 'antd';
import {CheckOutlined, CloseOutlined, EditOutlined, ReloadOutlined, MessageOutlined} from '@ant-design/icons';
import { useProject } from '../../providers/ProjectProvider';
import { useProjectPermissions } from '../../hooks/useProjectPermissions';
import { useAuth } from '@humansignal/core/providers/AuthProvider';
import type { AnnotationWithReview, ReviewStatus } from '@htx/core/types/annotation';
import { getReviewQueue, submitReview, bulkReview } from '../../services/annotationReview';
import { Comments } from '../../components/Comments';
import { format } from 'date-fns';

const { Option } = Select;
const { TextArea } = Input;

const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  fixed: 'blue',
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  fixed: 'Fixed',
};

export const ReviewQueue: React.FC = () => {
  const { project } = useProject();
  const { user } = useAuth();
  const { canReviewAnnotations } = useProjectPermissions();
  const [annotations, setAnnotations] = useState<AnnotationWithReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus>('pending');
  const [selectedAnnotator, setSelectedAnnotator] = useState<number | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [commentsDrawerVisible, setCommentsDrawerVisible] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<AnnotationWithReview | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const fetchAnnotations = useCallback(async () => {
    if (!project?.id) return;

    setLoading(true);
    try {
      const data = await getReviewQueue(project.id, {
        status: selectedStatus,
        annotator: selectedAnnotator,
      });
      setAnnotations(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to fetch annotations');
    } finally {
      setLoading(false);
    }
  }, [project?.id, selectedStatus, selectedAnnotator]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const handleReview = useCallback(
    async (annotation: AnnotationWithReview, status: ReviewStatus) => {
      setCurrentAnnotation(annotation);
      setReviewModalVisible(true);
    },
    []
  );

  const handleShowComments = useCallback((annotation: AnnotationWithReview) => {
    setCurrentAnnotation(annotation);
    setCommentsDrawerVisible(true);
  }, []);

  const handleSubmitReview = useCallback(
    async (status: ReviewStatus) => {
      if (!currentAnnotation) return;

      try {
        await submitReview(currentAnnotation.id, {
          review_status: status,
          review_comment: reviewComment,
        });
        message.success(`Annotation ${status}`);
        setReviewModalVisible(false);
        setReviewComment('');
        setCurrentAnnotation(null);
        fetchAnnotations();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to submit review');
      }
    },
    [currentAnnotation, reviewComment, fetchAnnotations]
  );

  const handleBulkReview = useCallback(
    async (status: ReviewStatus) => {
      if (!project?.id || selectedRowKeys.length === 0) return;

      Modal.confirm({
        title: `Bulk ${REVIEW_STATUS_LABELS[status]}`,
        content: `Are you sure you want to ${status.toLowerCase()} ${selectedRowKeys.length} annotation(s)?`,
        onOk: async () => {
          try {
            await bulkReview(project.id, {
              annotation_ids: selectedRowKeys.map(key => Number(key)),
              review_status: status,
            });
            message.success(`${selectedRowKeys.length} annotation(s) ${status}`);
            setSelectedRowKeys([]);
            fetchAnnotations();
          } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to bulk review');
          }
        },
      });
    },
    [project?.id, selectedRowKeys, fetchAnnotations]
  );

  if (!canReviewAnnotations) {
    return (
      <div className="p-6">
        <Typography.Title level={3}>Review Queue</Typography.Title>
        <Typography.Text>You don't have permission to review annotations.</Typography.Text>
      </div>
    );
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Task',
      dataIndex: 'task',
      key: 'task',
      width: 80,
      render: (task: number) => <a href={`/tasks/${task}`}># {task}</a>,
    },
    {
      title: 'Status',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 120,
      render: (status: ReviewStatus) => (
        <Tag color={REVIEW_STATUS_COLORS[status || 'pending']}>
          {REVIEW_STATUS_LABELS[status || 'pending']}
        </Tag>
      ),
    },
    {
      title: 'Annotator',
      dataIndex: 'completed_by',
      key: 'completed_by',
      width: 120,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => format(new Date(date), 'MMM d, yyyy HH:mm'),
    },
    {
      title: 'Reviewed By',
      dataIndex: 'reviewed_by_info',
      key: 'reviewed_by',
      width: 150,
      render: (info: any) =>
        info ? `${info.first_name} ${info.last_name}` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_: any, record: AnnotationWithReview) => (
        <div className="flex gap-2">
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleReview(record, 'approved')}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReview(record, 'rejected')}
          >
            Reject
          </Button>
          <Button
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleShowComments(record)}
          >
            Comments
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Typography.Title level={3}>Review Queue</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={fetchAnnotations}>
          Refresh
        </Button>
      </div>

      <div className="mb-4 flex gap-4">
        <Select
          style={{ width: 200 }}
          value={selectedStatus}
          onChange={setSelectedStatus}
          placeholder="Filter by status"
        >
          <Option value="pending">Pending</Option>
          <Option value="approved">Approved</Option>
          <Option value="rejected">Rejected</Option>
          <Option value="fixed">Fixed</Option>
        </Select>

        {selectedRowKeys.length > 0 && (
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleBulkReview('approved')}
            >
              Bulk Approve ({selectedRowKeys.length})
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => handleBulkReview('rejected')}
            >
              Bulk Reject ({selectedRowKeys.length})
            </Button>
          </div>
        )}
      </div>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={columns}
        dataSource={annotations}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} annotations`,
        }}
      />

      <Modal
        title="Review Annotation"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setReviewComment('');
          setCurrentAnnotation(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleSubmitReview('approved')}
          >
            Approve
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleSubmitReview('rejected')}
          >
            Reject
          </Button>,
        ]}
      >
        <div>
          <Typography.Text strong>Annotation ID: </Typography.Text>
          <Typography.Text>{currentAnnotation?.id}</Typography.Text>
        </div>
        <div className="mt-4">
          <Typography.Text strong>Comment (optional):</Typography.Text>
          <TextArea
            rows={4}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Add feedback or comments for the annotator..."
          />
        </div>
      </Modal>

      <Drawer
        title={`Comments - Annotation #${currentAnnotation?.id}`}
        placement="right"
        width={600}
        open={commentsDrawerVisible}
        onClose={() => {
          setCommentsDrawerVisible(false);
          setCurrentAnnotation(null);
        }}
      >
        {currentAnnotation && user && (
          <Comments
            annotationId={currentAnnotation.id}
            currentUserId={user.id}
            canEdit={canReviewAnnotations}
          />
        )}
      </Drawer>
    </div>
  );
};

ReviewQueue.title = 'Review Queue';
ReviewQueue.path = '/review';
