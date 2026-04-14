import React, { Component } from "react";
import { ErrorWrapper } from "../components/Error/Error";
import { Modal } from "../components/Modal/ModalPopup";
import { captureException } from "../config/Sentry";
import { FF_IMPROVE_GLOBAL_ERROR_MESSAGES, isFF } from "../utils/feature-flags";

export const ErrorContext = React.createContext();

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, { componentStack }) {
    console.error(error);

    // Capture the error in Sentry, so we can fix it directly
    // Don't make the users copy and paste the stacktrace, it's not actionable
    // Check if error has sentry_skip property (e.g., from ConfigurationError)
    captureException(error, {
      extra: {
        component_stacktrace: componentStack,
        sentry_skip: error.sentry_skip || false,
      },
    });
    this.setState({
      error,
      hasError: true,
      errorInfo: componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      const goBack = () => {
        // usually this will trigger React Router in the broken app, which is not helpful
        history.back();
        // so we reload app totally on that previous page after some delay for Router's stuff
        setTimeout(() => location.reload(), 32);
      };

      // We will capture the stacktrace in Sentry, so we don't need to show it in the modal
      // It is not actionable to the user, let's not show it
      const stacktrace = isFF(FF_IMPROVE_GLOBAL_ERROR_MESSAGES)
        ? undefined
        : `${errorInfo ? `Component Stack: ${errorInfo}` : ""}\n\n${this.state.error?.stack ?? ""}`;

      return (
        <Modal onHide={() => location.reload()} style={{ width: "60vw" }} visible bare>
          <div style={{ padding: 40 }}>
            <ErrorWrapper
              title="Runtime error"
              message={error}
              stacktrace={stacktrace}
              onGoBack={goBack}
              onReload={() => location.reload()}
            />
          </div>
        </Modal>
      );
    }

    return (
      <ErrorContext.Provider
        value={{
          hasError: this.state.hasError,
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          silence: this.silence,
          unsilence: this.unsilence,
        }}
      >
        {this.props.children}
      </ErrorContext.Provider>
    );
  }
}

export const ErrorUI = () => {
  const context = React.useContext(ErrorContext);

  return context.hasError && <div className="error">Error occurred</div>;
};
