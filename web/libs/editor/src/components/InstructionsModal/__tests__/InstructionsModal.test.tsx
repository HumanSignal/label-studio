import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { InstructionsModal } from '../InstructionsModal';

describe('InstructionsModal Component', () => {
  it('should render the title and children', () => {
    const title = 'Test Title';
    const children = <p>Test Children</p>;
    const { getByText } = render(
      <InstructionsModal title={title} visible={true} onCancel={() => {}}>
        {children}
      </InstructionsModal>,
    );

    expect(document.body.contains(getByText(title))).toBe(true);
    expect(document.body.contains(getByText('Test Children'))).toBe(true);
  });

  it('should render html', () => {
    const title = 'Test Title';
    const children = '<h1 style="color: red;">Test Children</h1>';

    render(
      <InstructionsModal title={title} visible={true} onCancel={() => {}}>
        {children}
      </InstructionsModal>,
    );

    expect(screen.queryByText('Test Children')).toBeTruthy();
    expect(screen.queryByText('color: red')).toBeNull();
  });

  it('should call onCancel when the modal is cancelled', () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <InstructionsModal title="Test Title" visible={true} onCancel={onCancel}>
        <p>Test Children</p>
      </InstructionsModal>,
    );

    fireEvent.click(getByLabelText('Close'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
