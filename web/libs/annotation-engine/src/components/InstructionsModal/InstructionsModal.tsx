import React from 'react';
import { Modal } from 'antd';

export const InstructionsModal = ({
  title,
  children,
  visible,
  onCancel,
}: {
  title: string,
  children: React.ReactNode,
  visible: boolean,
  onCancel: () => void,
}) => {
  return (
    <>
      <Modal
        title=""
        visible={visible}
        maskClosable
        footer={null}
        closable={true}
        onCancel={() => onCancel()}
        width="70%"
        style={{
          maxHeight: 'calc(100vh - 250px)',
          minWidth: '400px',
          maxWidth: '800px',
          borderRadius: '8px',
          overflow: 'hidden',
          padding: '0',
        }}
        bodyStyle={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)', padding: '0px' }}
      >
        <h2
          style={{
            position: 'sticky',
            top: '0px',
            background: 'white',
            padding: '24px 24px 20px',
            margin: '0px',
            fontWeight: '400',
            fontSize: '24',
          }}
        >
          {title}
        </h2>
        <p style={{ padding: '0 24px 24px', whiteSpace: 'pre-wrap' }}>{children}</p>
      </Modal>
    </>
  );
};
