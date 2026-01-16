/**
 * Quality Dashboard - displays project quality metrics and annotator performance
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Spin, message, Progress } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useProject } from '../../providers/ProjectProvider';
import type { ProjectMetrics, AnnotatorMetrics } from '@htx/core/types/quality';
import { getProjectMetrics, getAnnotatorMetrics } from '../../services/qualityMetrics';
import './QualityDashboard.scss';

const { Title, Text } = Typography;

export const QualityDashboard: React.FC = () => {
  const { project } = useProject();
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null);
  const [annotatorMetrics, setAnnotatorMetrics] = useState<AnnotatorMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!project?.id) return;

    setLoading(true);
    try {
      const [projMetrics, annotMetrics] = await Promise.all([
        getProjectMetrics(project.id),
        getAnnotatorMetrics(project.id),
      ]);
      setProjectMetrics(projMetrics);
      setAnnotatorMetrics(annotMetrics);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getQualityColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const annotatorColumns = [
    {
      title: 'Annotator',
      dataIndex: 'annotator_name',
      key: 'annotator_name',
      render: (name: string) => (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          {name}
        </span>
      ),
    },
    {
      title: 'Total Annotations',
      dataIndex: 'total_annotations',
      key: 'total_annotations',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.total_annotations - b.total_annotations,
    },
    {
      title: 'Quality Score',
      dataIndex: 'average_quality_score',
      key: 'average_quality_score',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.average_quality_score - b.average_quality_score,
      render: (score: number) => (
        <div className="quality-score-cell">
          <Progress
            percent={score}
            size="small"
            strokeColor={getQualityColor(score)}
            format={(percent) => `${percent?.toFixed(1)}%`}
          />
        </div>
      ),
    },
    {
      title: 'Accuracy',
      dataIndex: 'average_accuracy_score',
      key: 'average_accuracy_score',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.average_accuracy_score - b.average_accuracy_score,
      render: (score: number) => (
        <Tag color={getQualityColor(score)}>{score.toFixed(1)}%</Tag>
      ),
    },
    {
      title: 'Approval Rate',
      dataIndex: 'approval_rate',
      key: 'approval_rate',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.approval_rate - b.approval_rate,
      render: (rate: number) => (
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
          {rate.toFixed(1)}%
        </span>
      ),
    },
    {
      title: 'Rejection Rate',
      dataIndex: 'rejection_rate',
      key: 'rejection_rate',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.rejection_rate - b.rejection_rate,
      render: (rate: number) => (
        <span>
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
          {rate.toFixed(1)}%
        </span>
      ),
    },
    {
      title: 'Avg Time (sec)',
      dataIndex: 'average_time_spent',
      key: 'average_time_spent',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.average_time_spent - b.average_time_spent,
      render: (time: number) => time.toFixed(1),
    },
    {
      title: 'Per Day',
      dataIndex: 'annotations_per_day',
      key: 'annotations_per_day',
      sorter: (a: AnnotatorMetrics, b: AnnotatorMetrics) => a.annotations_per_day - b.annotations_per_day,
      render: (count: number) => count.toFixed(1),
    },
  ];

  if (loading || !projectMetrics) {
    return (
      <div className="quality-dashboard-loading">
        <Spin size="large" tip="Loading quality metrics..." />
      </div>
    );
  }

  return (
    <div className="quality-dashboard">
      <div className="dashboard-header">
        <Title level={3}>
          <TrophyOutlined style={{ marginRight: 12 }} />
          Quality Dashboard
        </Title>
        <button
          className="refresh-button"
          onClick={fetchMetrics}
          disabled={loading}
        >
          <ReloadOutlined spin={loading} />
          Refresh
        </button>
      </div>

      {/* Project Overview Cards */}
      <Row gutter={[16, 16]} className="metrics-row">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Annotations"
              value={projectMetrics.total_annotations}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={projectMetrics.completion_rate}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Average Quality"
              value={projectMetrics.average_quality_score}
              precision={1}
              suffix="%"
              valueStyle={{ color: getQualityColor(projectMetrics.average_quality_score) }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Agreement Score"
              value={projectMetrics.average_agreement_score}
              precision={1}
              suffix="%"
              valueStyle={{ color: getQualityColor(projectMetrics.average_agreement_score) }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts and Issues */}
      <Row gutter={[16, 16]} className="metrics-row">
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Needs Review"
              value={projectMetrics.annotations_needing_review}
              valueStyle={{ color: projectMetrics.annotations_needing_review > 0 ? '#faad14' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Outliers Detected"
              value={projectMetrics.outlier_count}
              valueStyle={{ color: projectMetrics.outlier_count > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Active Annotators"
              value={projectMetrics.annotator_count}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Annotator Performance Table */}
      <Card className="annotator-metrics-card" title="Annotator Performance">
        <Table
          columns={annotatorColumns}
          dataSource={annotatorMetrics}
          rowKey="annotator_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} annotators`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Quality Insights */}
      {projectMetrics.average_quality_score < 70 && (
        <Card className="insights-card">
          <div className="insight-item warning">
            <ExclamationCircleOutlined style={{ fontSize: 24, marginRight: 12 }} />
            <div>
              <Text strong>Low Quality Alert</Text>
              <br />
              <Text type="secondary">
                Average quality score is below 70%. Consider providing additional training
                or reviewing annotation guidelines with the team.
              </Text>
            </div>
          </div>
        </Card>
      )}

      {projectMetrics.annotations_needing_review > 10 && (
        <Card className="insights-card">
          <div className="insight-item info">
            <ExclamationCircleOutlined style={{ fontSize: 24, marginRight: 12 }} />
            <div>
              <Text strong>Review Backlog</Text>
              <br />
              <Text type="secondary">
                There are {projectMetrics.annotations_needing_review} annotations flagged for review.
                Consider increasing reviewer capacity or reviewing quality thresholds.
              </Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

QualityDashboard.title = 'Quality Dashboard';
QualityDashboard.path = '/quality';
