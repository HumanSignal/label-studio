import React from 'react';
import { ApiContext } from '../../providers/ApiProvider';
import { ErrorWrapper } from './Error';

export const InlineError = ({children, includeValidation}) => {
  const context = React.useContext(ApiContext);

  React.useEffect(() => {
    context.showModal = false;
  }, [context]);

  return context.error ? (
    <div className="inline-error">
      <ErrorWrapper
        possum={false}
        {...context.errorFormatter(context.error, {includeValidation})}
      />
      {children}
    </div>
  ) : null;
};
