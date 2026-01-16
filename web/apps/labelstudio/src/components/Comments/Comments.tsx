/**
 * Comments component for annotation discussions
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, message, Modal, Space, Tag, Typography, Avatar } from 'antd';
import {
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import type { AnnotationComment } from '@htx/core/types/annotation';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  resolveComment,
} from '../../services/annotationComments';
import './Comments.scss';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CommentItemProps {
  comment: AnnotationComment;
  currentUserId: number;
  canEdit: boolean;
  onReply: (parentId: number) => void;
  onUpdate: () => void;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  canEdit,
  onReply,
  onUpdate,
  depth = 0,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [loading, setLoading] = useState(false);

  const isAuthor = comment.author.id === currentUserId;
  const canModify = isAuthor || canEdit;

  const handleEdit = async () => {
    if (!editText.trim()) {
      message.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await updateComment(comment.id, { text: editText });
      message.success('Comment updated');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Comment',
      content: 'Are you sure you want to delete this comment?',
      onOk: async () => {
        try {
          await deleteComment(comment.id);
          message.success('Comment deleted');
          onUpdate();
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to delete comment');
        }
      },
    });
  };

  const handleResolve = async () => {
    try {
      await resolveComment(comment.id, !comment.is_resolved);
      message.success(comment.is_resolved ? 'Comment reopened' : 'Comment resolved');
      onUpdate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to resolve comment');
    }
  };

  return (
    <div className={`comment-item depth-${depth}`}>
      <div className="comment-header">
        <Space>
          <Avatar size="small">{comment.author.first_name[0]}</Avatar>
          <Text strong>
            {comment.author.first_name} {comment.author.last_name}
          </Text>
          <Text type="secondary" className="comment-time">
            {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
          </Text>
          {comment.is_resolved && depth === 0 && (
            <Tag color="green" icon={<CheckOutlined />}>
              Resolved
            </Tag>
          )}
        </Space>
      </div>

      <div className="comment-body">
        {isEditing ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              autoFocus
            />
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={handleEdit}
                loading={loading}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(comment.text);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Space>
        ) : (
          <Text className="comment-text">{comment.text}</Text>
        )}
      </div>

      <div className="comment-actions">
        <Space size="small">
          {depth < 3 && (
            <Button
              type="link"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => onReply(comment.id)}
            >
              Reply
            </Button>
          )}

          {canModify && !isEditing && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}

          {canModify && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}

          {depth === 0 && (
            <Button
              type="link"
              size="small"
              icon={comment.is_resolved ? <CloseOutlined /> : <CheckOutlined />}
              onClick={handleResolve}
            >
              {comment.is_resolved ? 'Reopen' : 'Resolve'}
            </Button>
          )}
        </Space>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              canEdit={canEdit}
              onReply={onReply}
              onUpdate={onUpdate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentFormProps {
  annotationId: number;
  parentId?: number | null;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  annotationId,
  parentId = null,
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      message.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await createComment(annotationId, {
        text: text.trim(),
        parent: parentId,
      });
      message.success('Comment added');
      setText('');
      onSubmit();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-form">
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
      />
      <Space style={{ marginTop: 8 }}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!text.trim()}
        >
          {parentId ? 'Reply' : 'Comment'}
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>Cancel</Button>
        )}
      </Space>
    </div>
  );
};

interface CommentsProps {
  annotationId: number;
  currentUserId: number;
  canEdit?: boolean;
  showResolved?: boolean;
}

export const Comments: React.FC<CommentsProps> = ({
  annotationId,
  currentUserId,
  canEdit = false,
  showResolved = true,
}) => {
  const [comments, setComments] = useState<AnnotationComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getComments(annotationId);
      setComments(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [annotationId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleUpdate = () => {
    fetchComments();
    setReplyingTo(null);
  };

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.is_resolved);

  const unresolvedCount = comments.filter((c) => !c.is_resolved).length;

  return (
    <div className="comments-container">
      <div className="comments-header">
        <Space>
          <Title level={4}>
            Comments ({comments.length})
          </Title>
          {unresolvedCount > 0 && (
            <Tag color="orange">{unresolvedCount} unresolved</Tag>
          )}
        </Space>
      </div>

      <div className="comments-list">
        {loading ? (
          <Text type="secondary">Loading comments...</Text>
        ) : filteredComments.length === 0 ? (
          <Text type="secondary">No comments yet. Be the first to comment!</Text>
        ) : (
          filteredComments.map((comment) => (
            <React.Fragment key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                canEdit={canEdit}
                onReply={setReplyingTo}
                onUpdate={handleUpdate}
              />
              {replyingTo === comment.id && (
                <div className="reply-form">
                  <CommentForm
                    annotationId={annotationId}
                    parentId={comment.id}
                    onSubmit={handleUpdate}
                    onCancel={() => setReplyingTo(null)}
                    placeholder="Write a reply..."
                    autoFocus
                  />
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      <div className="comments-new">
        <CommentForm
          annotationId={annotationId}
          onSubmit={handleUpdate}
        />
      </div>
    </div>
  );
};
