/**
 * ReviewPanel - Component for displaying annotation review status and actions
 * Can be integrated into the labeling interface
 */
import React, { useState } from 'react';
import { Button, Card, Input, message, Space, Tag, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import type { AnnotationWithReview, ReviewStatus } from '@htx/core/types/annotation';
import { submitReview } from '../../services/annotationReview';
import './ReviewPanel.scss';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ReviewPanelProps {
  annotation: AnnotationWithReview;
  canReview: boolean;
  onReviewSubmitted?: (annotation: AnnotationWithReview) => void;
  compact?: boolean;
}

const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  fixed: 'blue',
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  fixed: 'Fixed',
};

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  annotation,
  canReview,
  onReviewSubmitted,
  compact = false,
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const status = annotation.review_status || 'pending';
  const isReviewed = status !== 'pending';

  const handleSubmitReview = async (newStatus: ReviewStatus) => {
    if (!canReview) {
      message.error('You do not have permission to review annotations');
      return;
    }

    setLoading(true);
    try {
      const updatedAnnotation = await submitReview(annotation.id, {
        review_status: newStatus,
        review_comment: comment,
      });
      message.success(`Annotation ${newStatus}`);
      setIsReviewing(false);
      setComment('');
      onReviewSubmitted?.(updatedAnnotation);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="review-panel-compact">
        <div className="review-status">
          <Text type="secondary">Review Status: </Text>
          <Tag color={REVIEW_STATUS_COLORS[status]}>
            {REVIEW_STATUS_LABELS[status]}
          </Tag>
        </div>
        {canReview && status === 'pending' && (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleSubmitReview('approved')}
              loading={loading}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleSubmitReview('rejected')}
              loading={loading}
            >
              Reject
            </Button>
          </Space>
        )}
      </div>
    );
  }

  return (
    <Card className="review-panel" title="Annotation Review">
      <div className="review-status-section">
        <div className="status-row">
          <Text strong>Status: </Text>
          <Tag color={REVIEW_STATUS_COLORS[status]}>
            {REVIEW_STATUS_LABELS[status]}
          </Tag>
        </div>

        {isReviewed && annotation.reviewed_by_info && (
          <>
            <div className="reviewer-info">
              <Text type="secondary">Reviewed by: </Text>
              <Text>
                {annotation.reviewed_by_info.first_name}{' '}
                {annotation.reviewed_by_info.last_name}
              </Text>
            </div>

            {annotation.reviewed_at && (
              <div className="review-date">
                <Text type="secondary">Reviewed at: </Text>
                <Text>
                  {format(new Date(annotation.reviewed_at), 'MMM d, yyyy HH:mm')}
                </Text>
              </div>
            )}

            {annotation.review_comment && (
              <div className="review-comment">
                <Text type="secondary">Comment:</Text>
                <div className="comment-content">
                  <Text>{annotation.review_comment}</Text>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {canReview && (
        <div className="review-actions">
          {!isReviewing && status === 'pending' ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                block
                icon={<CheckOutlined />}
                onClick={() => setIsReviewing(true)}
              >
                Review Annotation
              </Button>
            </Space>
          ) : isReviewing ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Add Comment (optional):</Text>
                <TextArea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add feedback or comments for the annotator..."
                />
              </div>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setIsReviewing(false);
                    setComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleSubmitReview('approved')}
                  loading={loading}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleSubmitReview('rejected')}
                  loading={loading}
                >
                  Reject
                </Button>
              </Space>
            </Space>
          ) : isReviewed ? (
            <Button
              block
              icon={<EditOutlined />}
              onClick={() => setIsReviewing(true)}
            >
              Change Review
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
};
